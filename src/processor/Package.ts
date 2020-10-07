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
  ExportableCaretValueRule
} from '../exportable';
import { FHIRProcessor } from './FHIRProcessor';
import { logger } from '../utils';
import { pullAt, groupBy, values, flatten, isEqual } from 'lodash';
import { fshtypes } from 'fsh-sushi';
const { FshCode } = fshtypes;

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
      // An invariant may be used in more than one place, but should only be added to the package once.
      const matchingInvariant = this.invariants.find(
        existingInvariant => existingInvariant.name === resource.name
      );
      if (matchingInvariant) {
        // If two invariants have the same name, they should be equal.
        if (!isEqual(matchingInvariant, resource)) {
          logger.error(
            `Cannot add invariant: different invariant with name ${resource.name} already found.`
          );
        }
      } else {
        this.invariants.push(resource);
      }
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

  // TODO: Optimization step: combine ContainsRule and OnlyRule for contained item with one type
  optimize(processor: FHIRProcessor) {
    logger.debug('Optimizing FSH definitions...');
    this.resolveProfileParents(processor);
    this.combineCardAndFlagRules();
    this.constructNamedExtensionContainsRules();
    this.suppressChoiceSlicingRules();
    this.removeDefaultExtensionContextRules();
    this.removeImpliedZeroToZeroCardRules();
  }

  private resolveProfileParents(processor: FHIRProcessor): void {
    for (const profile of this.profiles) {
      if (profile.parent) {
        const parentSd = processor.structureDefinitions.find(sd => sd.url === profile.parent);
        if (parentSd?.name) {
          profile.parent = parentSd.name;
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
}
