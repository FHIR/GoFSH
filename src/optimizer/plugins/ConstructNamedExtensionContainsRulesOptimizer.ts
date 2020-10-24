import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableContainsRule, ExportableOnlyRule } from '../../exportable';
import ResolveOnlyRuleURLsOptimizer from './ResolveOnlyRuleURLsOptimizer';
import { pullAt } from 'lodash';

export default {
  name: 'construct_named_extension_contains_rules',
  description: 'Convert "extension contains" rules to use named extensions where appropriate',
  runAfter: [ResolveOnlyRuleURLsOptimizer.name],

  optimize(pkg: Package): void {
    [...pkg.profiles, ...pkg.extensions].forEach(sd => {
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
} as OptimizerPlugin;
