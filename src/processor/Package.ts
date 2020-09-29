import {
  ExportableExtension,
  ExportableProfile,
  ExportableInstance,
  ExportableValueSet,
  ExportableCodeSystem,
  ExportableFlagRule,
  ExportableCardRule,
  ExportableCombinedCardFlagRule,
  ExportableCaretValueRule
} from '../exportable';
import { FHIRProcessor } from './FHIRProcessor';
import { logger } from '../utils';
import { pullAt } from 'lodash';
import { fshtypes } from 'fsh-sushi';

export class Package {
  public readonly profiles: ExportableProfile[] = [];
  public readonly extensions: ExportableExtension[] = [];
  public readonly instances: ExportableInstance[] = [];
  public readonly valueSets: ExportableValueSet[] = [];
  public readonly codeSystems: ExportableCodeSystem[] = [];

  constructor() {}

  add(
    resource:
      | ExportableProfile
      | ExportableExtension
      | ExportableInstance
      | ExportableValueSet
      | ExportableCodeSystem
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
    }
  }

  // TODO: if more optimization steps are added, break them into separate functions.
  // TODO: Optimization step: combine CardRule and FlagRule
  // TODO: Optimization step: combine ContainsRule and OnlyRule for contained item with one type
  optimize(processor: FHIRProcessor) {
    logger.debug('Optimizing FSH definitions...');
    this.resolveProfileParents(processor);
    this.combineCardAndFlagRules();
    this.suppressChoiceSlicingRules();
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

  // Choice elements have a standard set of slicing rules applied to them by SUSHI.
  // Therefore, it is not necessary to define that slicing using FSH when one of the choices exists.
  private suppressChoiceSlicingRules(): void {
    [...this.profiles, ...this.extensions].forEach(sd => {
      const rulesToRemove: number[] = [];
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
              otherRule => otherRule.path != rule.path && otherRule.path.startsWith(pathStart)
            )
          ) {
            rulesToRemove.push(i);
          }
        }
      });
      pullAt(sd.rules, rulesToRemove);
    });
  }
}
