import {
  ExportableExtension,
  ExportableProfile,
  ExportableInstance,
  ExportableValueSet,
  ExportableCodeSystem,
  ExportableFlagRule,
  ExportableCardRule,
  ExportableCombinedCardFlagRule
} from '../exportable';
import { FHIRProcessor } from './FHIRProcessor';
import { logger } from '../utils';
import { pullAt } from 'lodash';

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
