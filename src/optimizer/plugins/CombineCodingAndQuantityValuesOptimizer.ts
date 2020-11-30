import { fshtypes } from 'fsh-sushi';
import { pullAt } from 'lodash';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import {
  ExportableCaretValueRule,
  ExportableAssignmentRule,
  ExportableExtension,
  ExportableProfile,
  ExportableInstance,
  ExportableRule
} from '../../exportable';

const { FshCode, FshQuantity } = fshtypes;

export default {
  name: 'combine_coding_and_quantity_values',
  description:
    'Combine separate caret and assignment rules that together form a Coding or Quantity value',
  optimize(pkg: Package): void {
    // Coding has: code, system, display
    // Quantity has: code, system, unit, value
    // Profiles and Extensions may have relevant caret rules
    // Instances may have relevant assignment rules
    // It is not necessary to check assignment rules on Profiles and Extensions. Codings and Quantities that
    // are present on Profile and Extension elements are extracted as a single assignment rule, because they are represented as
    // a whole element (patternCoding, fixedQuantity, etc.) rather than a collection of parts.
    [...pkg.profiles, ...pkg.extensions].forEach(sd => {
      const rulesToRemove: number[] = [];
      sd.rules.forEach(rule => {
        if (
          rule instanceof ExportableCaretValueRule &&
          rule.caretPath.endsWith('.code') &&
          rule.value instanceof FshCode
        ) {
          const basePath = rule.caretPath.replace(/\.code$/, '');
          const siblingPaths = [
            `${basePath}.system`,
            `${basePath}.display`,
            `${basePath}.unit`,
            `${basePath}.value`
          ];
          const siblings = sd.rules.filter(
            otherRule =>
              otherRule instanceof ExportableCaretValueRule &&
              rule.path === otherRule.path &&
              siblingPaths.includes(otherRule.caretPath)
          ) as ExportableCaretValueRule[];
          if (siblings.length) {
            const systemSibling = siblings.find(sibling => sibling.caretPath.endsWith('.system'));
            const displaySibling = siblings.find(sibling => sibling.caretPath.endsWith('.display'));
            const unitSibling = siblings.find(sibling => sibling.caretPath.endsWith('.unit'));
            const valueSibling = siblings.find(sibling => sibling.caretPath.endsWith('.value'));
            if (valueSibling && systemSibling?.value === 'http://unitsofmeasure.org') {
              rule.caretPath = basePath;
              rule.value = new FshQuantity(
                valueSibling.value as number,
                new FshCode(rule.value.code, 'http://unitsofmeasure.org')
              );
              rulesToRemove.push(sd.rules.indexOf(valueSibling), sd.rules.indexOf(systemSibling));
            } else if (unitSibling) {
              rule.caretPath = basePath;
              rule.value.display = unitSibling.value.toString();
              rulesToRemove.push(sd.rules.indexOf(unitSibling));
              // system may also be present
              if (systemSibling) {
                rule.value.system = systemSibling.value.toString();
                rulesToRemove.push(sd.rules.indexOf(systemSibling));
              }
            } else if (systemSibling || displaySibling) {
              rule.caretPath = basePath;
              if (systemSibling) {
                rule.value.system = systemSibling.value.toString();
                rulesToRemove.push(sd.rules.indexOf(systemSibling));
              }
              if (displaySibling) {
                rule.value.display = displaySibling.value.toString();
                rulesToRemove.push(sd.rules.indexOf(displaySibling));
              }
              moveUpCaretValueRule(rule, sd, siblings);
            }
          }
        }
      });
      pullAt(sd.rules, rulesToRemove);
    });
    pkg.instances.forEach(instance => {
      const rulesToRemove: number[] = [];
      instance.rules.forEach(rule => {
        if (
          rule instanceof ExportableAssignmentRule &&
          rule.path.endsWith('.code') &&
          rule.value instanceof FshCode
        ) {
          const basePath = rule.path.replace(/\.code$/, '');
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
            if (valueSibling && systemSibling?.value === 'http://unitsofmeasure.org') {
              rule.path = basePath;
              rule.value = new FshQuantity(
                valueSibling.value as number,
                new FshCode(rule.value.code, 'http://unitsofmeasure.org')
              );
              rulesToRemove.push(
                instance.rules.indexOf(valueSibling),
                instance.rules.indexOf(systemSibling)
              );
            } else if (unitSibling) {
              rule.path = basePath;
              rule.value.display = unitSibling.value.toString();
              rulesToRemove.push(instance.rules.indexOf(unitSibling));
              // system may also be present
              if (systemSibling) {
                rule.value.system = systemSibling.value.toString();
                rulesToRemove.push(instance.rules.indexOf(systemSibling));
              }
            } else if (systemSibling || displaySibling) {
              rule.path = basePath;
              if (systemSibling) {
                rule.value.system = systemSibling.value.toString();
                rulesToRemove.push(instance.rules.indexOf(systemSibling));
              }
              if (displaySibling) {
                rule.value.display = displaySibling.value.toString();
                rulesToRemove.push(instance.rules.indexOf(displaySibling));
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
  sd: ExportableProfile | ExportableExtension,
  knownSiblings: ExportableCaretValueRule[]
): void {
  // if the caretPath ends with coding[0], and there are no sibling rules that use indices on coding,
  // we can move the rule up a level to take advantage of how SUSHI handles rules on CodeableConcepts.
  if (rule.caretPath.endsWith('coding[0]')) {
    const basePath = rule.caretPath.replace(/\.coding\[0]$/, '');
    const siblings = sd.rules.filter(
      otherRule =>
        otherRule instanceof ExportableCaretValueRule &&
        !knownSiblings.includes(otherRule) &&
        rule !== otherRule &&
        rule.path === otherRule.path &&
        otherRule.caretPath.startsWith(`${basePath}.coding[`)
    );
    if (siblings.length === 0) {
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
    const siblings = instance.rules.filter(
      otherRule =>
        rule !== otherRule &&
        !knownSiblings.includes(otherRule) &&
        otherRule.path.startsWith(`${basePath}.coding[`)
    );
    if (siblings.length === 0) {
      rule.path = basePath;
    }
  }
}
