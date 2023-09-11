import { fshtypes, fshrules, fhirtypes } from 'fsh-sushi';
import { pullAt } from 'lodash';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { getTypesForCaretPath, getTypesForInstancePath } from '../utils';
import { Package } from '../../processor';
import {
  ExportableCaretValueRule,
  ExportableAssignmentRule,
  ExportableExtension,
  ExportableProfile,
  ExportableInstance,
  ExportableRule,
  ExportableValueSet,
  ExportableCodeSystem
} from '../../exportable';
import { MasterFisher } from '../../utils';

const { FshCode, FshQuantity } = fshtypes;
const OPTIMIZABLE_TYPES = [
  'code',
  'Coding',
  'CodeableConcept',
  'Quantity',
  'Age',
  'Distance',
  'Duration',
  'Count'
];
const CODE_IMPOSTER_PATHS = [
  /^concept(\[[^\]]+\])?(\.concept(\[[^\]]+\])?)*$/, // from CodeSystem
  /^group(\[[^\]]+\])?\.element(\[[^\]]+\])?(\.target(\[[^\]]+\])?)?$/, // from ConceptMap
  /^group(\[[^\]]+\])?\.unmapped$/, // from ConceptMap
  /^compose\.(include|exclude)(\[[^\]]+\])?\.concept(\[[^\]]+\])?$/, // from ValueSet
  /^expansion(\.contains(\[[^\]]+\])?)+$/ // from ValueSet
];

export default {
  name: 'combine_coding_and_quantity_values',
  description:
    'Combine separate caret and assignment rules that together form a Coding or Quantity value',
  optimize(pkg: Package, fisher: MasterFisher): void {
    // Coding has: code, system, display
    // Quantity has: code, system, unit, value
    // If "value" is present, the rule should use a FshQuantity.
    // Otherwise, the rule should keep its FshCode.
    // Profiles and Extensions may have relevant caret rules
    // Instances may have relevant assignment rules
    // It is not necessary to check assignment rules on Profiles and Extensions. Codings and Quantities that
    // are present on Profile and Extension elements are extracted as a single assignment rule, because they are represented as
    // a whole element (patternCoding, fixedQuantity, etc.) rather than a collection of parts.
    [...pkg.profiles, ...pkg.extensions, ...pkg.valueSets, ...pkg.codeSystems].forEach(def => {
      const rulesToRemove: number[] = [];
      const rules: fshrules.Rule[] = def.rules; // <-- this assignment makes TypeScript happier in the next chunk of code
      const typeCache: Map<string, fhirtypes.ElementDefinitionType[]> = new Map();

      const ruleMap: { [path: string]: { [caretPath: string]: ExportableCaretValueRule } } = {};
      rules
        .filter(r => r instanceof ExportableCaretValueRule)
        .forEach((r: ExportableCaretValueRule) => {
          ruleMap[r.path] = ruleMap[r.path] ?? {};
          ruleMap[r.path][r.caretPath] = r;
        });

      rules.forEach(rule => {
        if (
          rule instanceof ExportableCaretValueRule &&
          rule.caretPath.endsWith('.code') &&
          rule.value instanceof FshCode
        ) {
          const basePath = rule.caretPath.replace(/\.code$/, '');
          const normalizedPath = basePath.replace(/\[[^\]]+\]/g, '');
          let types: fhirtypes.ElementDefinitionType[];
          if (typeCache.has(normalizedPath)) {
            types = typeCache.get(normalizedPath);
          } else {
            types = getTypesForCaretPath(def, rule.path, basePath, fisher);
            typeCache.set(normalizedPath, types);
          }
          if (types && !types.some(t => OPTIMIZABLE_TYPES.indexOf(t.code) >= 0)) {
            return;
          }

          const siblings = [
            `${basePath}.system`,
            `${basePath}.display`,
            `${basePath}.unit`,
            `${basePath}.value`
          ]
            .map(sibling => ruleMap[rule.path]?.[sibling])
            .filter(sibling => !!sibling);
          if (siblings.length) {
            const systemSibling = siblings.find(sibling => sibling.caretPath.endsWith('.system'));
            const displaySibling = siblings.find(sibling => sibling.caretPath.endsWith('.display'));
            const unitSibling = siblings.find(sibling => sibling.caretPath.endsWith('.unit'));
            const valueSibling = siblings.find(sibling => sibling.caretPath.endsWith('.value'));
            rule.caretPath = basePath;
            if (valueSibling) {
              rule.value = new FshQuantity(
                valueSibling.value as number,
                new FshCode(rule.value.code)
              );
              rulesToRemove.push(rules.indexOf(valueSibling));
              if (systemSibling) {
                rule.value.unit.system = systemSibling.value.toString();
                rulesToRemove.push(rules.indexOf(systemSibling));
              }
              if (unitSibling) {
                rule.value.unit.display = unitSibling.value.toString();
                rulesToRemove.push(rules.indexOf(unitSibling));
              }
            } else {
              if (systemSibling) {
                rule.value.system = systemSibling.value.toString();
                rulesToRemove.push(rules.indexOf(systemSibling));
              }
              if (displaySibling || unitSibling) {
                const displaySource = displaySibling || unitSibling;
                rule.value.display = displaySource.value.toString();
                rulesToRemove.push(rules.indexOf(displaySource));
              }
              moveUpCaretValueRule(rule, def, siblings);
            }
          }
        }
      });
      pullAt(rules, rulesToRemove);
    });
    const typeCache: Map<string, Map<string, fhirtypes.ElementDefinitionType[]>> = new Map();
    pkg.instances.forEach(instance => {
      const rulesToRemove: number[] = [];
      if (!typeCache.has(instance.instanceOf)) {
        typeCache.set(instance.instanceOf, new Map());
      }
      const instanceTypeCache = typeCache.get(instance.instanceOf);
      instance.rules.forEach(rule => {
        if (
          rule instanceof ExportableAssignmentRule &&
          rule.path.endsWith('.code') &&
          rule.value instanceof FshCode
        ) {
          const basePath = rule.path.replace(/\.code$/, '');
          const normalizedPath = basePath.replace(/\[[^\]]+\]/g, '');
          let types: fhirtypes.ElementDefinitionType[];
          if (instanceTypeCache.has(normalizedPath)) {
            types = instanceTypeCache.get(normalizedPath);
          } else {
            types = getTypesForInstancePath(instance, basePath, fisher);
            instanceTypeCache.set(normalizedPath, types);
          }
          if (types && !types.some(t => OPTIMIZABLE_TYPES.indexOf(t.code) >= 0)) {
            return;
          }
          // types might be null if it's an instance of a profile that the fisher couldn't find.
          // In this case, just to be safe, don't optimize known bad paths!
          else if (types == null && CODE_IMPOSTER_PATHS.some(cip => cip.test(basePath))) {
            return;
          }

          const siblingPaths = [
            `${basePath}.system`,
            `${basePath}.display`,
            `${basePath}.unit`,
            `${basePath}.value`
          ];
          const siblings = instance.rules.filter(
            otherRule =>
              otherRule instanceof ExportableAssignmentRule && siblingPaths.includes(otherRule.path)
          ) as ExportableAssignmentRule[];
          if (siblings.length) {
            const systemSibling = siblings.find(sibling => sibling.path.endsWith('.system'));
            const displaySibling = siblings.find(sibling => sibling.path.endsWith('.display'));
            const unitSibling = siblings.find(sibling => sibling.path.endsWith('.unit'));
            const valueSibling = siblings.find(sibling => sibling.path.endsWith('.value'));
            rule.path = basePath;
            if (valueSibling) {
              rule.value = new FshQuantity(
                valueSibling.value as number,
                new FshCode(rule.value.code)
              );
              rulesToRemove.push(instance.rules.indexOf(valueSibling));
              if (systemSibling) {
                rule.value.unit.system = systemSibling.value.toString();
                rulesToRemove.push(instance.rules.indexOf(systemSibling));
              }
              if (unitSibling) {
                rule.value.unit.display = unitSibling.value.toString();
                rulesToRemove.push(instance.rules.indexOf(unitSibling));
              }
            } else {
              if (systemSibling) {
                rule.value.system = systemSibling.value.toString();
                rulesToRemove.push(instance.rules.indexOf(systemSibling));
              }
              if (displaySibling || unitSibling) {
                const displaySource = displaySibling || unitSibling;
                rule.value.display = displaySource.value.toString();
                rulesToRemove.push(instance.rules.indexOf(displaySource));
              }
              moveUpAssignmentRule(rule, instance, siblings);
            }
          }
        }
      });
      pullAt(instance.rules, rulesToRemove);
    });
  }
} as OptimizerPlugin;

function moveUpCaretValueRule(
  rule: ExportableCaretValueRule,
  sd: ExportableProfile | ExportableExtension | ExportableValueSet | ExportableCodeSystem,
  knownSiblings: ExportableCaretValueRule[]
): void {
  // if the caretPath ends with coding[0], and there are no sibling rules that use indices on coding,
  // we can move the rule up a level to take advantage of how SUSHI handles rules on CodeableConcepts.
  if (rule.caretPath.endsWith('coding[0]')) {
    const basePath = rule.caretPath.replace(/\.coding\[0]$/, '');
    const hasOtherSiblings = sd.rules.some(
      (otherRule: fshrules.Rule) =>
        rule !== otherRule &&
        otherRule instanceof ExportableCaretValueRule &&
        !knownSiblings.includes(otherRule) &&
        rule.path === otherRule.path &&
        otherRule.caretPath.startsWith(`${basePath}.coding[`)
    );
    if (!hasOtherSiblings) {
      rule.caretPath = basePath;
    }
  }
}

function moveUpAssignmentRule(
  rule: ExportableAssignmentRule,
  instance: ExportableInstance,
  knownSiblings: ExportableRule[]
): void {
  // if the path ends with coding[0], and there are no sibling rules that use indices on coding,
  // we can move the rule up a level to take advantage of how SUSHI handles rules on CodeableConcepts.
  if (rule.path.endsWith('coding[0]')) {
    const basePath = rule.path.replace(/\.coding\[0]$/, '');
    const hasOtherSiblings = instance.rules.some(
      otherRule =>
        rule !== otherRule &&
        otherRule instanceof ExportableAssignmentRule &&
        !knownSiblings.includes(otherRule) &&
        otherRule.path.startsWith(`${basePath}.coding[`)
    );
    if (!hasOtherSiblings) {
      rule.path = basePath;
    }
  }
}
