import { ExportableSdRule } from '../exportable';

// Places general Quantity-setting rules ahead of Quantity.unit setting rules
export function switchQuantityRules(rules: ExportableSdRule[]): void {
  const seenRules = new Map();
  rules.forEach((rule, index) => {
    if (!seenRules.has(rule.path)) seenRules.set(rule.path, index);
    const unitRulePath = rule.path.concat('.unit');
    if (seenRules.has(unitRulePath)) {
      const unitRuleIndex = seenRules.get(unitRulePath);
      rules.splice(unitRuleIndex, 0, rule);
      delete rules[index + 1];
    }
  });
}
