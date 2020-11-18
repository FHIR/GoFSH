import { fshtypes } from 'fsh-sushi';
import { pullAt } from 'lodash';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableCaretValueRule, ExportableAssignmentRule } from '../../exportable';

const { FshCode, FshQuantity } = fshtypes;

export default {
  name: 'combine_coding_and_quantity_values',
  description:
    'Combine separate caret and assignment rules that together form a Coding or Quantity value',
  optimize(pkg: Package): void {
    // Coding has: code, system, display
    // Quantity has: code, system, unit, value
    // Profiles and Extensions may have relevant caret rules
    // Instances may have relevant assignment rules
    [...pkg.profiles, ...pkg.extensions].forEach(sd => {
      const rulesToRemove: number[] = [];
      sd.rules.forEach(rule => {
        if (
          rule instanceof ExportableCaretValueRule &&
          rule.caretPath.endsWith('.code') &&
          rule.value instanceof FshCode
        ) {
          const basePath = rule.caretPath.replace(/\.code$/, '');
          const siblingPaths = [
            `${basePath}.system`,
            `${basePath}.display`,
            `${basePath}.unit`,
            `${basePath}.value`
          ];
          const siblings = sd.rules.filter(
            otherRule =>
              otherRule instanceof ExportableCaretValueRule &&
              rule.path === otherRule.path &&
              siblingPaths.includes(otherRule.caretPath)
          ) as ExportableCaretValueRule[];
          if (siblings.length) {
            const systemSibling = siblings.find(sibling => sibling.caretPath.endsWith('.system'));
            const displaySibling = siblings.find(sibling => sibling.caretPath.endsWith('.display'));
            const unitSibling = siblings.find(sibling => sibling.caretPath.endsWith('.unit'));
            const valueSibling = siblings.find(sibling => sibling.caretPath.endsWith('.value'));
            if (unitSibling) {
              rule.caretPath = basePath;
              rule.value.display = unitSibling.value.toString();
              rulesToRemove.push(sd.rules.indexOf(unitSibling));
              // system may also be present
              if (systemSibling) {
                rule.value.system = systemSibling.value.toString();
                rulesToRemove.push(sd.rules.indexOf(systemSibling));
              }
            } else if (valueSibling && systemSibling?.value === 'http://unitsofmeasure.org') {
              rule.caretPath = basePath;
              rule.value = new FshQuantity(
                valueSibling.value as number,
                new FshCode(rule.value.code, 'http://unitsofmeasure.org')
              );
              rulesToRemove.push(sd.rules.indexOf(valueSibling), sd.rules.indexOf(systemSibling));
            } else if (systemSibling || displaySibling) {
              rule.caretPath = basePath;
              if (systemSibling) {
                rule.value.system = systemSibling.value.toString();
                rulesToRemove.push(sd.rules.indexOf(systemSibling));
              }
              if (displaySibling) {
                rule.value.display = displaySibling.value.toString();
                rulesToRemove.push(sd.rules.indexOf(displaySibling));
              }
            }
          }
        }
      });
      pullAt(sd.rules, rulesToRemove);
    });
    pkg.instances.forEach(instance => {
      const rulesToRemove: number[] = [];
      instance.rules.forEach(rule => {
        if (
          rule instanceof ExportableAssignmentRule &&
          rule.path.endsWith('.code') &&
          rule.value instanceof FshCode
        ) {
          const basePath = rule.path.replace(/\.code$/, '');
          const siblingPaths = [
            `${basePath}.system`,
            `${basePath}.display`,
            `${basePath}.unit`,
            `${basePath}.value`
          ];
          const siblings = instance.rules.filter(
            otherRule =>
              otherRule instanceof ExportableAssignmentRule && siblingPaths.includes(otherRule.path)
          ) as ExportableAssignmentRule[];
          if (siblings.length) {
            const systemSibling = siblings.find(sibling => sibling.path.endsWith('.system'));
            const displaySibling = siblings.find(sibling => sibling.path.endsWith('.display'));
            const unitSibling = siblings.find(sibling => sibling.path.endsWith('.unit'));
            const valueSibling = siblings.find(sibling => sibling.path.endsWith('.value'));
            if (unitSibling) {
              rule.path = basePath;
              rule.value.display = unitSibling.value.toString();
              rulesToRemove.push(instance.rules.indexOf(unitSibling));
              // system may also be present
              if (systemSibling) {
                rule.value.system = systemSibling.value.toString();
                rulesToRemove.push(instance.rules.indexOf(systemSibling));
              }
            } else if (valueSibling && systemSibling?.value === 'http://unitsofmeasure.org') {
              rule.path = basePath;
              rule.value = new FshQuantity(
                valueSibling.value as number,
                new FshCode(rule.value.code, 'http://unitsofmeasure.org')
              );
              rulesToRemove.push(
                instance.rules.indexOf(valueSibling),
                instance.rules.indexOf(systemSibling)
              );
            } else if (systemSibling || displaySibling) {
              rule.path = basePath;
              if (systemSibling) {
                rule.value.system = systemSibling.value.toString();
                rulesToRemove.push(instance.rules.indexOf(systemSibling));
              }
              if (displaySibling) {
                rule.value.display = displaySibling.value.toString();
                rulesToRemove.push(instance.rules.indexOf(displaySibling));
              }
            }
          }
        }
      });
      pullAt(instance.rules, rulesToRemove);
    });
  }
} as OptimizerPlugin;
