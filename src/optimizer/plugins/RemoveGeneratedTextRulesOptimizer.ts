import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableCaretValueRule, ExportableRule } from '../../exportable';
import { pullAt } from 'lodash';
import { fshtypes } from 'fsh-sushi';

export default {
  name: 'remove_generated_text_rules',
  description: 'Remove caret rules on "text" which represent generated content.',

  optimize(pkg: Package): void {
    [...pkg.profiles, ...pkg.extensions, ...pkg.valueSets, ...pkg.codeSystems].forEach(resource => {
      const rulesToRemove: number[] = [];
      const hasGeneratedText = resource.rules.some(
        (rule: ExportableRule) =>
          rule instanceof ExportableCaretValueRule &&
          rule.path === '' &&
          rule.caretPath === 'text.status' &&
          rule.value instanceof fshtypes.FshCode &&
          ['generated', 'extensions'].includes(rule.value.code)
      );
      if (hasGeneratedText) {
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
  }
} as OptimizerPlugin;
