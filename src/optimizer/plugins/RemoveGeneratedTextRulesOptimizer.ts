import { remove } from 'lodash';
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
  ExportableValueSet,
  ExportableLogical,
  ExportableResource,
  ExportableAddElementRule
} from '../../exportable';
import { fshtypes } from 'fsh-sushi';

export default {
  name: 'remove_generated_text_rules',
  description: 'Remove rules on "text" which represent generated content.',

  optimize(pkg: Package): void {
    [
      ...pkg.profiles,
      ...pkg.extensions,
      ...pkg.logicals,
      ...pkg.resources,
      ...pkg.valueSets,
      ...pkg.codeSystems
    ].forEach(resource => {
      if (hasGeneratedText(resource)) {
        remove(
          resource.rules as ExportableRule[],
          rule =>
            rule instanceof ExportableCaretValueRule &&
            rule.path === '' &&
            rule.caretPath.match(/^text\./)
        );
      }
    });

    [...pkg.instances].forEach(instance => {
      if (hasGeneratedText(instance)) {
        remove(
          instance.rules,
          rule => rule instanceof ExportableAssignmentRule && rule.path.match(/^text\./)
        );
      }
    });
  }
} as OptimizerPlugin;

export function hasGeneratedText(
  resource:
    | ExportableInstance
    | ExportableProfile
    | ExportableExtension
    | ExportableLogical
    | ExportableResource
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
      (rule: ExportableRule | ExportableAddElementRule) =>
        rule instanceof ExportableCaretValueRule &&
        rule.path === '' &&
        rule.caretPath === 'text.status' &&
        rule.value instanceof fshtypes.FshCode &&
        ['generated', 'extensions'].includes(rule.value.code)
    );
  }
}
