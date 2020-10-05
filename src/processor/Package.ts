import {
  ExportableExtension,
  ExportableProfile,
  ExportableInstance,
  ExportableValueSet,
  ExportableCodeSystem,
  ExportableInvariant,
  ExportableFlagRule,
  ExportableCardRule,
  ExportableCombinedCardFlagRule
} from '../exportable';
import { FHIRProcessor } from './FHIRProcessor';
import { logger } from '../utils';
import { pullAt, isEqual } from 'lodash';

export class Package {
  public readonly profiles: ExportableProfile[] = [];
  public readonly extensions: ExportableExtension[] = [];
  public readonly instances: ExportableInstance[] = [];
  public readonly valueSets: ExportableValueSet[] = [];
  public readonly codeSystems: ExportableCodeSystem[] = [];
  public readonly invariants: ExportableInvariant[] = [];

  constructor() {}

  add(
    resource:
      | ExportableProfile
      | ExportableExtension
      | ExportableInstance
      | ExportableValueSet
      | ExportableCodeSystem
      | ExportableInvariant
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
    }
  }

  // TODO: if more optimization steps are added, break them into separate functions.
  // TODO: Optimization step: combine CardRule and FlagRule
  // TODO: Optimization step: combine ContainsRule and OnlyRule for contained item with one type
  optimize(processor: FHIRProcessor) {
    logger.debug('Optimizing FSH definitions...');
    this.resolveProfileParents(processor);
    this.combineCardAndFlagRules();
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
}
