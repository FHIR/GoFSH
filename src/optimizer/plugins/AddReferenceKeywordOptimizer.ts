import { fhirtypes, fshtypes } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableAssignmentRule } from '../../exportable';
import { MasterFisher } from '../../utils';
import { splitOnPathPeriods } from 'fsh-sushi/dist/fhirtypes/common';
import { pullAt } from 'lodash';

export default {
  name: 'add_reference_keyword_optimizer',
  description: 'Adds the "Reference" keyword to instances where applicable',

  optimize(pkg: Package, fisher: MasterFisher): void {
    let sd: fhirtypes.StructureDefinition;
    pkg.instances.forEach(instance => {
      const rulesToRemove: number[] = [];

      instance.rules
        .filter(rule => rule instanceof ExportableAssignmentRule)
        .forEach((rule: ExportableAssignmentRule, i: number) => {
          // Since looking up the type takes some time, only do it when it is plausible
          // that the type of the element is Reference
          if (rule.path.endsWith('reference') && typeof rule.value === 'string') {
            sd = sd ?? fisher.fishForStructureDefinition(instance.instanceOf);
            // We search for the path of the parent, without numerical indices, since
            // findElementByPath does not handle numerical indices
            const parentPath = splitOnPathPeriods(rule.path).slice(0, -1).join('.');
            const searchablePath = parentPath.replace(/\[\d+\]/g, '');
            if (sd?.findElementByPath(searchablePath, fisher)?.type?.[0]?.code === 'Reference') {
              const reference = new fshtypes.FshReference(rule.value);
              // If we are converting the reference, look for a matching display rule, using the
              // original numerical parent path
              const matchingDisplayRuleIndex = instance.rules
                .filter(rule => rule instanceof ExportableAssignmentRule)
                .findIndex(otherRule => otherRule.path === `${parentPath}.display`);
              if (matchingDisplayRuleIndex >= 0) {
                rulesToRemove.push(matchingDisplayRuleIndex);
                reference.display = (instance.rules[
                  matchingDisplayRuleIndex
                ] as ExportableAssignmentRule).value as string;
              }
              (instance.rules[i] as ExportableAssignmentRule).value = reference;
            }
          }
        });
      pullAt(instance.rules, rulesToRemove);
    });
  }
} as OptimizerPlugin;
