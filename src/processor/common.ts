import { pullAt } from 'lodash';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableSdRule
} from '../exportable';

// Places general Quantity-setting rules ahead of Quantity.unit setting rules
export function switchQuantityRules(rules: ExportableSdRule[]): void {
  let unitIndex: number;
  let lastSiblingIndex: number;
  let basePath: string;
  let siblingPaths: string[];
  rules.forEach((rule, index) => {
    if (!(rule instanceof ExportableAssignmentRule || rule instanceof ExportableCaretValueRule)) {
      return;
    }
    const operativePath = rule instanceof ExportableCaretValueRule ? rule.caretPath : rule.path;
    if (operativePath.endsWith('.unit')) {
      unitIndex = index;
      basePath = operativePath.replace(/\.unit$/, '');
      siblingPaths = [`${basePath}.system`, `${basePath}.code`, `${basePath}.value`, basePath];
    } else {
      if (siblingPaths?.includes(operativePath)) {
        lastSiblingIndex = index;
        if (lastSiblingIndex > unitIndex) {
          rules.splice(unitIndex, 0, rule);
          pullAt(rules, [index + 1]);
        }
      }
    }
  });
}
