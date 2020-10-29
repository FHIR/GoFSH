import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableContainsRule } from '../../exportable';
import ConstructNamedExtensionContainsRulesOptimizer from './ConstructNamedExtensionContainsRulesOptimizer';
import { pullAt } from 'lodash';

export default {
  name: 'combine_contains_rules',
  description:
    'Combine separate contains rules on the same path to a single contains rule with multiple items',
  runAfter: [ConstructNamedExtensionContainsRulesOptimizer.name],

  optimize(pkg: Package): void {
    [...pkg.profiles, ...pkg.extensions].forEach(sd => {
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
} as OptimizerPlugin;
