import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';

export default {
  name: 'switch_quantity_unit_rules',
  description:
    'Detect when FSHQuantitiy.unit is being set before the FSHQuantity and swap the rules to prevent an overwrite',

  optimize(pkg: Package): void {
    [...pkg.profiles, ...pkg.extensions, ...pkg.instances].forEach(resource => {
      const seenRules = new Map();
      resource.rules.forEach((rule, index) => {
        if (!seenRules.has(rule.path)) seenRules.set(rule.path, index);
        const unitRulePath = rule.path.concat('.unit');
        if (seenRules.has(unitRulePath)) {
          const unitRuleIndex = seenRules.get(unitRulePath);
          resource.rules.splice(unitRuleIndex, 0, rule);
          delete resource.rules[index + 1];
        }
      });
    });
  }
} as OptimizerPlugin;
