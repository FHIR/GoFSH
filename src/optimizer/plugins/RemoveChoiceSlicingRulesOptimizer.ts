import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableCaretValueRule } from '../../exportable';
import { flatten, groupBy, pullAt, values } from 'lodash';
import { fshtypes } from 'fsh-sushi';

// Choice elements have a standard set of slicing rules applied to them by SUSHI.
// Therefore, it is not necessary to define that slicing using FSH when one of the choices exists.
// If the full set of four default rules exists for the same element, remove those rules.
export default {
  name: 'remove_choice_slicing_rules',
  description: 'Remove standard choice slicing rules that SUSHI automatically applies to choices',

  optimize(pkg: Package): void {
    [...pkg.profiles, ...pkg.extensions].forEach(sd => {
      const rulesToMaybeRemove: number[] = [];
      sd.rules.forEach((rule, i, allRules) => {
        if (rule instanceof ExportableCaretValueRule && rule.path.endsWith('[x]')) {
          const pathStart = rule.path.replace(/\[x\]$/, '');
          // check the four relevant caret paths and their default values, and
          // check if one of the choices exists
          if (
            ((rule.caretPath === 'slicing.discriminator[0].type' &&
              rule.value instanceof fshtypes.FshCode &&
              rule.value.code === 'type') ||
              (rule.caretPath === 'slicing.discriminator[0].path' && rule.value === '$this') ||
              (rule.caretPath === 'slicing.ordered' && rule.value === false) ||
              (rule.caretPath === 'slicing.rules' &&
                rule.value instanceof fshtypes.FshCode &&
                rule.value.code === 'open')) &&
            allRules.some(
              otherRule =>
                !otherRule.path.startsWith(rule.path) && otherRule.path.startsWith(pathStart)
            )
          ) {
            rulesToMaybeRemove.push(i);
          }
        }
      });
      // if four rules to maybe remove have the same path, then that's a full set of defaults, and they are removed
      const rulesToRemove = flatten(
        values(groupBy(rulesToMaybeRemove, i => sd.rules[i].path)).filter(
          ruleGroup => ruleGroup.length === 4
        )
      );
      pullAt(sd.rules, rulesToRemove);
    });
  }
} as OptimizerPlugin;
