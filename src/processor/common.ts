import { pullAt } from 'lodash';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableSdRule
} from '../exportable';

// Places general Quantity-setting rules ahead of Quantity.unit setting rules
export function switchQuantityRules(rules: ExportableSdRule[]): void {
  const seenRules = new Map();
  rules.forEach((rule, index) => {
    if (!(rule instanceof ExportableAssignmentRule || rule instanceof ExportableCaretValueRule)) {
      return;
    }
    if (!seenRules.has(rule.path)) seenRules.set(rule.path, index);
    const unitRulePath = rule.path.concat('.unit');
    if (seenRules.has(unitRulePath)) {
      const unitRuleIndex = seenRules.get(unitRulePath);
      rules.splice(unitRuleIndex, 0, rule);
      pullAt(rules, [index + 1]);
    }
  });
}

// Places general Quantity-setting rules ahead of Quantity.unit setting rules
// Note: A different function is required for Instances due to the way assignment rules are generated
// When STU2 Features are enabled in GoFSH, this can be removed in favor of editing the
// CombineCodingAndQuantityValuesOptimizer to include unit rules as well
export function switchQuantityRulesOnInstances(rules: ExportableSdRule[]): void {
  let unitIndex: number;
  let lastSiblingIndex: number;
  let basePath: string;
  let siblingPaths: string[];
  rules.forEach((rule, index) => {
    if (rule.path.endsWith('.unit')) {
      unitIndex = index;
      basePath = rule.path.replace(/\.unit$/, '');
      siblingPaths = [`${basePath}.system`, `${basePath}.code`, `${basePath}.value`];
    } else {
      if (siblingPaths?.includes(rule.path)) {
        lastSiblingIndex = index;
        if (lastSiblingIndex > unitIndex) {
          rules.splice(unitIndex, 0, rule);
          pullAt(rules, [index + 1]);
        }
      }
    }
  });
}
