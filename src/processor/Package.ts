import {
  ExportableExtension,
  ExportableProfile,
  ExportableInstance,
  ExportableValueSet,
  ExportableCodeSystem,
  ExportableInvariant,
  ExportableConfiguration,
  ExportableFlagRule,
  ExportableCardRule,
  ExportableCombinedCardFlagRule,
  ExportableContainsRule,
  ExportableOnlyRule,
  ExportableCaretValueRule,
  ExportableAssignmentRule,
  ExportableRule
} from '../exportable';
import { FHIRProcessor } from './FHIRProcessor';
import { logger } from '../utils';
import { pullAt, groupBy, values, flatten, isEqual } from 'lodash';
import { fshtypes } from 'fsh-sushi';
const { FshCode } = fshtypes;

const FHIR_BASE_URL = /http:\/\/hl7\.org\/fhir\/StructureDefinition\/(.+)/;

export class Package {
  public readonly profiles: ExportableProfile[] = [];
  public readonly extensions: ExportableExtension[] = [];
  public readonly instances: ExportableInstance[] = [];
  public readonly valueSets: ExportableValueSet[] = [];
  public readonly codeSystems: ExportableCodeSystem[] = [];
  public readonly invariants: ExportableInvariant[] = [];
  public configuration: ExportableConfiguration;

  constructor() {}

  add(
    resource:
      | ExportableProfile
      | ExportableExtension
      | ExportableInstance
      | ExportableValueSet
      | ExportableCodeSystem
      | ExportableInvariant
      | ExportableConfiguration
  ) {
    if (resource instanceof ExportableProfile) {
      this.profiles.push(resource);
    } else if (resource instanceof ExportableExtension) {
      this.extensions.push(resource);
    } else if (resource instanceof ExportableInstance) {
      this.instances.push(resource);
    } else if (resource instanceof ExportableValueSet) {
      this.valueSets.push(resource);
    } else if (resource instanceof ExportableCodeSystem) {
      this.codeSystems.push(resource);
    } else if (resource instanceof ExportableInvariant) {
      this.invariants.push(resource);
    } else if (resource instanceof ExportableConfiguration) {
      if (this.configuration) {
        logger.warn(
          `Multiple implementation guide resources found in input folder. Skipping implementation guide with canonical ${resource.config.canonical}`
        );
      } else {
        this.configuration = resource;
      }
    }
  }

  optimize(processor: FHIRProcessor) {
    logger.debug('Optimizing FSH definitions...');
    this.resolveProfileParents(processor);
    this.combineCardAndFlagRules();
    this.constructNamedExtensionContainsRules();
    this.suppressChoiceSlicingRules();
    this.removeDefaultExtensionContextRules();
    this.removeImpliedZeroToZeroCardRules();
    this.suppressUrlAssignmentOnExtensions();
    this.removeDefaultSlicingRules();
    this.removeDateRules();
    this.combineContainsRules();
    this.simplifyOnlyRules(processor);
  }

  private resolveProfileParents(processor: FHIRProcessor): void {
    for (const resource of [...this.profiles, ...this.extensions]) {
      if (resource.parent) {
        // The parent might be another SD in the processor or a core FHIR resource
        const parentSd = processor.structureDefinitions.find(sd => sd.url === resource.parent);
        if (parentSd?.name) {
          resource.parent = parentSd.name;
        } else {
          const fhirMatch = resource.parent.match(FHIR_BASE_URL);
          if (fhirMatch?.[1]) {
            // Only change the FHIR url into a name if it won't collide with a local SD
            if (!processor.structureDefinitions.some(sd => sd.name === fhirMatch[1])) {
              resource.parent = fhirMatch[1];
            }
          }
        }
      }
    }
  }

  private combineCardAndFlagRules(): void {
    [...this.profiles, ...this.extensions].forEach(sd => {
      const rulesToRemove: number[] = [];
      sd.rules.forEach((rule, i) => {
        if (rule instanceof ExportableCardRule) {
          const flagRuleIdx = sd.rules.findIndex(
            other => other.path === rule.path && other instanceof ExportableFlagRule
          );
          if (flagRuleIdx >= 0) {
            sd.rules[i] = new ExportableCombinedCardFlagRule(
              rule.path,
              rule,
              sd.rules[flagRuleIdx] as ExportableFlagRule
            );
            rulesToRemove.push(flagRuleIdx);
          }
        }
      });
      pullAt(sd.rules, rulesToRemove);
    });
  }

  private constructNamedExtensionContainsRules(): void {
    [...this.profiles, ...this.extensions].forEach(sd => {
      const rulesToRemove: number[] = [];
      sd.rules.forEach(rule => {
        if (rule instanceof ExportableContainsRule && rule.path.endsWith('extension')) {
          rule.items.forEach(item => {
            const onlyRuleIdx = sd.rules.findIndex(
              other =>
                other.path === `${rule.path}[${item.name}]` && other instanceof ExportableOnlyRule
            );
            const onlyRule = sd.rules[onlyRuleIdx] as ExportableOnlyRule;
            // Explicitly ignore "Extension" since some IGs (ex: USCore) add a type constraint to Extension
            // on the differential unnecessarily. Using the "named" syntax with "Extension" causes errors in SUSHI.
            // As long as the type is not "Extension", we assume it is a profile of Extension, and we can therefore
            // use the "named" syntax.
            if (onlyRule?.types.length === 1 && onlyRule?.types[0].type !== 'Extension') {
              item.type = onlyRule.types[0].type;
              rulesToRemove.push(onlyRuleIdx);
            }
          });
        }
      });
      pullAt(sd.rules, rulesToRemove);
    });
  }

  // Choice elements have a standard set of slicing rules applied to them by SUSHI.
  // Therefore, it is not necessary to define that slicing using FSH when one of the choices exists.
  // If the full set of four default rules exists for the same element, remove those rules.
  private suppressChoiceSlicingRules(): void {
    [...this.profiles, ...this.extensions].forEach(sd => {
      const rulesToMaybeRemove: number[] = [];
      sd.rules.forEach((rule, i, allRules) => {
        if (rule instanceof ExportableCaretValueRule && rule.path.endsWith('[x]')) {
          const pathStart = rule.path.replace(/\[x\]$/, '');
          // check the four relevant caret paths and their default values, and
          // check if one of the choices exists
          if (
            ((rule.caretPath === 'slicing.discriminator[0].type' &&
              rule.value instanceof fshtypes.FshCode &&
              rule.value.code === 'type') ||
              (rule.caretPath === 'slicing.discriminator[0].path' && rule.value === '$this') ||
              (rule.caretPath === 'slicing.ordered' && rule.value === false) ||
              (rule.caretPath === 'slicing.rules' &&
                rule.value instanceof fshtypes.FshCode &&
                rule.value.code === 'open')) &&
            allRules.some(
              otherRule =>
                !otherRule.path.startsWith(rule.path) && otherRule.path.startsWith(pathStart)
            )
          ) {
            rulesToMaybeRemove.push(i);
          }
        }
      });
      // if four rules to maybe remove have the same path, then that's a full set of defaults, and they are removed
      const rulesToRemove = flatten(
        values(groupBy(rulesToMaybeRemove, i => sd.rules[i].path)).filter(
          ruleGroup => ruleGroup.length === 4
        )
      );
      pullAt(sd.rules, rulesToRemove);
    });
  }

  // If an extension only has a single context, and it is the default context, suppress it.
  private removeDefaultExtensionContextRules(): void {
    // * ^context[0].type = #element
    const DEFAULT_TYPE = new ExportableCaretValueRule('');
    DEFAULT_TYPE.caretPath = 'context[0].type';
    DEFAULT_TYPE.value = new FshCode('element');
    // * ^context[0].expression = "Element"
    const DEFAULT_EXPRESSION = new ExportableCaretValueRule('');
    DEFAULT_EXPRESSION.caretPath = 'context[0].expression';
    DEFAULT_EXPRESSION.value = 'Element';
    // Loop through extensions looking for the default context type (and removing it)
    this.extensions.forEach(sd => {
      const numContexts = sd.rules.filter(
        r =>
          r instanceof ExportableCaretValueRule &&
          r.path === '' &&
          /^context\[\d+]\.type$/.test(r.caretPath)
      ).length;
      if (numContexts === 1) {
        const typeRuleIdx = sd.rules.findIndex(r => isEqual(r, DEFAULT_TYPE));
        const expressionRuleIdx = sd.rules.findIndex(r => isEqual(r, DEFAULT_EXPRESSION));
        if (typeRuleIdx !== -1 && expressionRuleIdx !== -1) {
          pullAt(sd.rules, [typeRuleIdx, expressionRuleIdx]);
        }
      }
    });
  }

  // If an extension has meaningful value[x] rules, SUSHI will constrain extension to 0..0.
  // If an extension adds sub-extensions, SUSHI will constrain value[x] to 0..0.
  // GoFSH does not need to output these 0..0 rules since SUSHI will automatically add them.
  // This goes for top-value paths in extensions as well as all sub-extensions.
  private removeImpliedZeroToZeroCardRules(): void {
    this.extensions.forEach(sd => {
      const rulesToRemove: number[] = [];
      sd.rules.forEach((r, i) => {
        if (
          // r is a 0..0 card rule, AND
          r instanceof ExportableCardRule &&
          r.max === '0' &&
          //r is an extension path and there exist sibling value paths that are not 0..0, OR
          ((r.path.endsWith('extension') &&
            sd.rules.some(
              r2 =>
                r2.path.startsWith(r.path.replace(/extension$/, 'value')) &&
                !(r2 instanceof ExportableCardRule && r2.max === '0')
            )) ||
            // r is a value[x] path and there exist sibling extension paths that are not 0..0
            (r.path.endsWith('value[x]') &&
              sd.rules.some(
                r2 =>
                  r2.path.startsWith(r.path.replace(/value\[x]$/, 'extension')) &&
                  !(r2 instanceof ExportableCardRule && r2.max === '0')
              )))
        ) {
          rulesToRemove.push(i);
        }
      });
      pullAt(sd.rules, rulesToRemove);
    });
  }

  private suppressUrlAssignmentOnExtensions(): void {
    // Loop over all profiles and extensions, removing assignment rules on inline extensions
    // NOTE: Inline extensions on a profile are allowed by SUSHI, but they are technically not
    // valid FHIR and the IG Publisher does not like this
    [...this.profiles, ...this.extensions].forEach(sd => {
      const rulesToRemove: number[] = [];
      sd.rules.forEach(rule => {
        if (rule instanceof ExportableContainsRule && /(modifierE|e)xtension$/.test(rule.path)) {
          rule.items.forEach(item => {
            const assignmentRuleIdx = sd.rules.findIndex(
              other =>
                other instanceof ExportableAssignmentRule &&
                other.path === `${rule.path}[${item.name}].url` &&
                other.value === item.name
            );
            if (assignmentRuleIdx >= 0) {
              rulesToRemove.push(assignmentRuleIdx);
            }
          });
        }
      });
      pullAt(sd.rules, rulesToRemove);
    });
    // We must know the configuration to determine if a rule assigning "url" matches the url that SUSHI will assume
    if (this.configuration?.config?.canonical) {
      this.extensions.forEach(extension => {
        const rulesToRemove: number[] = [];
        extension.rules.forEach((rule, i) => {
          if (
            rule instanceof ExportableAssignmentRule &&
            rule.path === 'url' &&
            rule.value ===
              `${this.configuration.config.canonical}/StructureDefinition/${extension.id}`
          ) {
            rulesToRemove.push(i);
          }
        });
        pullAt(extension.rules, rulesToRemove);
      });
    }
  }

  private removeDefaultSlicingRules(): void {
    [...this.profiles, ...this.extensions].forEach(sd => {
      const rulesToMaybeRemove: number[] = [];
      sd.rules.forEach((rule, i, allRules) => {
        if (rule instanceof ExportableCaretValueRule && /(modifierE|e)xtension$/.test(rule.path)) {
          // * path ^slicing.discriminator[0].type = #value
          const DEFAULT_SLICING_DISCRIMINATOR_TYPE = new ExportableCaretValueRule(rule.path);
          DEFAULT_SLICING_DISCRIMINATOR_TYPE.caretPath = 'slicing.discriminator[0].type';
          DEFAULT_SLICING_DISCRIMINATOR_TYPE.value = new FshCode('value');
          // * path ^slicing.discriminator[0].value = "url"
          const DEFAULT_SLICING_DISCRIMINATOR_PATH = new ExportableCaretValueRule(rule.path);
          DEFAULT_SLICING_DISCRIMINATOR_PATH.caretPath = 'slicing.discriminator[0].path';
          DEFAULT_SLICING_DISCRIMINATOR_PATH.value = 'url';
          // * path ^slicing.ordered = false
          const DEFAULT_SLICING_ORDERED = new ExportableCaretValueRule(rule.path);
          DEFAULT_SLICING_ORDERED.caretPath = 'slicing.ordered';
          DEFAULT_SLICING_ORDERED.value = false;
          // * path ^slicing.rules = #open
          const DEFAULT_SLICING_RULES = new ExportableCaretValueRule(rule.path);
          DEFAULT_SLICING_RULES.caretPath = 'slicing.rules';
          DEFAULT_SLICING_RULES.value = new FshCode('open');
          const hasContainsRule = allRules.some(
            otherRule => otherRule instanceof ExportableContainsRule && otherRule.path === rule.path
          );
          const hasOneSlicingDiscriminatorRule = !allRules.some(
            otherRule =>
              otherRule.path === rule.path &&
              otherRule instanceof ExportableCaretValueRule &&
              otherRule.caretPath !== 'slicing.discriminator[0].type' &&
              otherRule.caretPath !== 'slicing.discriminator[0].path' &&
              otherRule.caretPath.startsWith('slicing.discriminator[')
          );
          if (
            // One of the four default rules
            (isEqual(rule, DEFAULT_SLICING_DISCRIMINATOR_TYPE) ||
              isEqual(rule, DEFAULT_SLICING_DISCRIMINATOR_PATH) ||
              isEqual(rule, DEFAULT_SLICING_ORDERED) ||
              isEqual(rule, DEFAULT_SLICING_RULES)) &&
            // Some contains rule at the same path
            hasContainsRule &&
            // No other slicing.discriminator rules at the same path
            hasOneSlicingDiscriminatorRule
          ) {
            rulesToMaybeRemove.push(i);
          }
        }
      });
      // If four rules to maybe remove have the same path, then that's a full set of defaults, and they are removed
      const rulesToRemove = flatten(
        values(groupBy(rulesToMaybeRemove, i => sd.rules[i].path)).filter(
          ruleGroup => ruleGroup.length === 4
        )
      );
      pullAt(sd.rules, rulesToRemove);
    });
  }

  private removeDateRules(): void {
    let allDatesMatch = true;
    let date: string;
    for (const resource of [
      ...this.profiles,
      ...this.extensions,
      ...this.valueSets,
      ...this.codeSystems
    ]) {
      for (const rule of resource.rules) {
        if (
          rule instanceof ExportableCaretValueRule &&
          rule.caretPath === 'date' &&
          rule.path === ''
        ) {
          const dateValue = rule.value as string; // If the rule assigns a date, the value will be a string.
          if (!date) date = dateValue; // Set the date to match
          if (date !== dateValue) {
            allDatesMatch = false;
            return; // If any date hasn't matched the others, we don't want to remove any rules.
          }
        }
      }
    }

    // If there are no date CaretValueRules found, just return.
    if (date == null) {
      return;
    }

    // If all dates are the same, are defined to the second, and are in GMT,
    // we can assume they were set by the IG Publisher and can be safely removed.
    // Make sure the value matches one allowed by the dateTime type in FHIR.
    // See: http://hl7.org/fhir/R4/datatypes.html#dateTime
    const dateTimeRegex = /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1])(T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00)))?)?)?$/;
    const dateTimeMatch = date.match(dateTimeRegex);
    const usesGMT = dateTimeMatch && date.endsWith('+00:00'); // If it is a valid FHIR dateTime, check that it uses GMT time zone
    if (allDatesMatch && usesGMT) {
      const DEFAULT_DATE = new ExportableCaretValueRule('');
      DEFAULT_DATE.caretPath = 'date';
      DEFAULT_DATE.value = date;
      [...this.profiles, ...this.extensions, ...this.valueSets, ...this.codeSystems].forEach(
        resource => {
          (resource.rules as ExportableRule[]) = (resource.rules as ExportableRule[]).filter(
            rule => !isEqual(rule, DEFAULT_DATE)
          );
        }
      );
    }
  }

  private combineContainsRules(): void {
    [...this.profiles, ...this.extensions].forEach(sd => {
      const rulesToRemove: number[] = [];
      sd.rules.forEach((rule, i) => {
        if (rule instanceof ExportableContainsRule && !rulesToRemove.includes(i)) {
          sd.rules.forEach((otherRule, otherRuleIdx) => {
            if (
              otherRule.path === rule.path &&
              otherRule instanceof ExportableContainsRule &&
              otherRuleIdx !== i
            ) {
              rulesToRemove.push(otherRuleIdx);
              rule.items.push(...otherRule.items);
              rule.cardRules.push(...otherRule.cardRules);
              rule.flagRules.push(...otherRule.flagRules);
            }
          });
        }
      });
      pullAt(sd.rules, rulesToRemove);
    });
  }

  private simplifyOnlyRules(processor: FHIRProcessor): void {
    [...this.profiles, ...this.extensions].forEach(sd => {
      sd.rules.forEach(rule => {
        if (rule instanceof ExportableOnlyRule) {
          rule.types.forEach(onlyRuleType => {
            // The type might be another SD in the processor or a core FHIR resource
            const typeSd = processor.structureDefinitions.find(sd => sd.url === onlyRuleType.type);
            if (typeSd?.name) {
              onlyRuleType.type = typeSd.name;
            } else {
              const fhirMatch = onlyRuleType.type.match(FHIR_BASE_URL);
              if (fhirMatch?.[1]) {
                // Only change the FHIR url into a name if it won't collide with a local SD
                if (!processor.structureDefinitions.some(sd => sd.name === fhirMatch[1])) {
                  onlyRuleType.type = fhirMatch[1];
                }
              }
            }
          });
        }
      });
    });
  }
}
