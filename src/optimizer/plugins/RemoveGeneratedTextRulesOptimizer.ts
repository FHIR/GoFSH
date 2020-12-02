import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableCodeSystem,
  ExportableExtension,
  ExportableInstance,
  ExportableProfile,
  ExportableRule,
  ExportableValueSet
} from '../../exportable';
import { pullAt } from 'lodash';
import { fshtypes } from 'fsh-sushi';

export default {
  name: 'remove_generated_text_rules',
  description: 'Remove rules on "text" which represent generated content.',

  optimize(pkg: Package): void {
    [...pkg.profiles, ...pkg.extensions, ...pkg.valueSets, ...pkg.codeSystems].forEach(resource => {
      const rulesToRemove: number[] = [];
      if (hasGeneratedText(resource)) {
        resource.rules.forEach((rule: ExportableRule, i: number) => {
          if (
            rule instanceof ExportableCaretValueRule &&
            rule.path === '' &&
            rule.caretPath.match(/^text\./)
          ) {
            rulesToRemove.push(i);
          }
        });
      }
      pullAt(resource.rules as ExportableRule[], rulesToRemove);
    });

    [...pkg.instances].forEach(instance => {
      const rulesToRemove: number[] = [];
      if (hasGeneratedText(instance)) {
        instance.rules.forEach((rule: ExportableRule, i: number) => {
          if (rule instanceof ExportableAssignmentRule && rule.path.match(/^text\./)) {
            rulesToRemove.push(i);
          }
        });
      }
      pullAt(instance.rules as ExportableRule[], rulesToRemove);
    });
  }
} as OptimizerPlugin;

export function hasGeneratedText(
  resource:
    | ExportableInstance
    | ExportableProfile
    | ExportableExtension
    | ExportableValueSet
    | ExportableCodeSystem
): boolean {
  if (resource instanceof ExportableInstance) {
    return resource.rules.some(
      (rule: ExportableRule) =>
        rule instanceof ExportableAssignmentRule &&
        rule.path === 'text.status' &&
        rule.value instanceof fshtypes.FshCode &&
        ['generated', 'extensions'].includes(rule.value.code)
    );
  } else {
    return resource.rules.some(
      (rule: ExportableRule) =>
        rule instanceof ExportableCaretValueRule &&
        rule.path === '' &&
        rule.caretPath === 'text.status' &&
        rule.value instanceof fshtypes.FshCode &&
        ['generated', 'extensions'].includes(rule.value.code)
    );
  }
}
