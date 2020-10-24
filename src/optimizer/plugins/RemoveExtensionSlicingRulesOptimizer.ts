import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableCaretValueRule, ExportableContainsRule } from '../../exportable';
import { flatten, groupBy, isEqual, pullAt, values } from 'lodash';
import { fshtypes } from 'fsh-sushi';
const { FshCode } = fshtypes;

export default {
  name: 'remove_extension_slicing_rules',
  description:
    'Remove standard extension slicing rules that SUSHI automatically applies to extension paths',

  optimize(pkg: Package): void {
    [...pkg.profiles, ...pkg.extensions].forEach(sd => {
      const rulesToMaybeRemove: number[] = [];
      sd.rules.forEach((rule, i, allRules) => {
        if (rule instanceof ExportableCaretValueRule && /(modifierE|e)xtension$/.test(rule.path)) {
          // * path ^slicing.discriminator[0].type = #value
          const DEFAULT_SLICING_DISCRIMINATOR_TYPE = new ExportableCaretValueRule(rule.path);
          DEFAULT_SLICING_DISCRIMINATOR_TYPE.caretPath = 'slicing.discriminator[0].type';
          DEFAULT_SLICING_DISCRIMINATOR_TYPE.value = new FshCode('value');
          // * path ^slicing.discriminator[0].value = "url"
          const DEFAULT_SLICING_DISCRIMINATOR_PATH = new ExportableCaretValueRule(rule.path);
          DEFAULT_SLICING_DISCRIMINATOR_PATH.caretPath = 'slicing.discriminator[0].path';
          DEFAULT_SLICING_DISCRIMINATOR_PATH.value = 'url';
          // * path ^slicing.ordered = false
          const DEFAULT_SLICING_ORDERED = new ExportableCaretValueRule(rule.path);
          DEFAULT_SLICING_ORDERED.caretPath = 'slicing.ordered';
          DEFAULT_SLICING_ORDERED.value = false;
          // * path ^slicing.rules = #open
          const DEFAULT_SLICING_RULES = new ExportableCaretValueRule(rule.path);
          DEFAULT_SLICING_RULES.caretPath = 'slicing.rules';
          DEFAULT_SLICING_RULES.value = new FshCode('open');
          const hasContainsRule = allRules.some(
            otherRule => otherRule instanceof ExportableContainsRule && otherRule.path === rule.path
          );
          const hasOneSlicingDiscriminatorRule = !allRules.some(
            otherRule =>
              otherRule.path === rule.path &&
              otherRule instanceof ExportableCaretValueRule &&
              otherRule.caretPath !== 'slicing.discriminator[0].type' &&
              otherRule.caretPath !== 'slicing.discriminator[0].path' &&
              otherRule.caretPath.startsWith('slicing.discriminator[')
          );
          if (
            // One of the four default rules
            (isEqual(rule, DEFAULT_SLICING_DISCRIMINATOR_TYPE) ||
              isEqual(rule, DEFAULT_SLICING_DISCRIMINATOR_PATH) ||
              isEqual(rule, DEFAULT_SLICING_ORDERED) ||
              isEqual(rule, DEFAULT_SLICING_RULES)) &&
            // Some contains rule at the same path
            hasContainsRule &&
            // No other slicing.discriminator rules at the same path
            hasOneSlicingDiscriminatorRule
          ) {
            rulesToMaybeRemove.push(i);
          }
        }
      });
      // If four rules to maybe remove have the same path, then that's a full set of defaults, and they are removed
      const rulesToRemove = flatten(
        values(groupBy(rulesToMaybeRemove, i => sd.rules[i].path)).filter(
          ruleGroup => ruleGroup.length === 4
        )
      );
      pullAt(sd.rules, rulesToRemove);
    });
  }
} as OptimizerPlugin;
