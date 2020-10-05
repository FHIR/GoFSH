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
import { fshtypes } from 'fsh-sushi';
import { isEqual, pullAt } from 'lodash';

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

  // TODO: Optimization step: combine ContainsRule and OnlyRule for contained item with one type
  optimize(processor: FHIRProcessor) {
    logger.debug('Optimizing FSH definitions...');
    this.resolveProfileParents(processor);
    this.combineCardAndFlagRules();
    this.removeDefaultExtensionContextRules();
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

  // If an extension only has a single context, and it is the default context, suppress it.
  private removeDefaultExtensionContextRules(): void {
    this.extensions.forEach(sd => {
      const numContexts = sd.rules.filter(
        r =>
          r instanceof ExportableCaretValueRule &&
          r.path === '' &&
          /^context\[\d+]\.type$/.test(r.caretPath)
      ).length;
      if (numContexts === 1) {
        // * ^context[0].type = #element
        const typeRuleIdx = sd.rules.findIndex(
          r =>
            r instanceof ExportableCaretValueRule &&
            r.path === '' &&
            r.caretPath === 'context[0].type' &&
            isEqual((r as ExportableCaretValueRule).value, new fshtypes.FshCode('element'))
        );
        // * ^context[0].expression = "Element"
        const expressionRuleIdx = sd.rules.findIndex(
          r =>
            r instanceof ExportableCaretValueRule &&
            r.path === '' &&
            r.caretPath === 'context[0].expression' &&
            isEqual(r.value, 'Element')
        );
        if (typeRuleIdx !== -1 && expressionRuleIdx !== -1) {
          pullAt(sd.rules, [typeRuleIdx, expressionRuleIdx]);
        }
      }
    });
  }
}
