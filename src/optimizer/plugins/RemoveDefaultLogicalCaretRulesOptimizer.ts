import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableCaretValueRule } from '../../exportable';
import { pullAt, isEqual } from 'lodash';
import { fshtypes } from 'fsh-sushi';
import { CaretValueRule } from 'fsh-sushi/dist/fshtypes/rules';

const { FshCode } = fshtypes;

export default {
  name: 'remove_default_logical_caret_rules_optimizer',
  description:
    'Remove caret rules on a Logical that provide values that will be provided by default SUSHI behavior',

  optimize(pkg: Package): void {
    // * ^kind = #logical
    const DEFAULT_KIND = new ExportableCaretValueRule('');
    DEFAULT_KIND.caretPath = 'kind';
    DEFAULT_KIND.value = new FshCode('logical');
    // * ^abstract = false
    const DEFAULT_ABSTRACT = new ExportableCaretValueRule('');
    DEFAULT_ABSTRACT.caretPath = 'abstract';
    DEFAULT_ABSTRACT.value = false;
    // * ^type = {the Logical's URL}
    const DEFAULT_TYPE = new ExportableCaretValueRule('');
    DEFAULT_TYPE.caretPath = 'type';
    // check for these on Logicals
    pkg.logicals.forEach(logical => {
      const ruleIndicesToRemove: number[] = [];
      const urlRule = logical.rules.find(
        rule => rule instanceof CaretValueRule && rule.path === '' && rule.caretPath === 'url'
      ) as CaretValueRule;
      if (urlRule) {
        DEFAULT_TYPE.value = urlRule.value;
      } else {
        DEFAULT_TYPE.value = `${pkg.configuration.config.canonical}/StructureDefinition/${logical.id}`;
      }
      logical.rules.forEach((rule, idx) => {
        if (
          rule instanceof ExportableCaretValueRule &&
          (isEqual(rule, DEFAULT_KIND) ||
            isEqual(rule, DEFAULT_ABSTRACT) ||
            isEqual(rule, DEFAULT_TYPE))
        ) {
          ruleIndicesToRemove.push(idx);
        }
      });
      if (ruleIndicesToRemove.length > 0) {
        pullAt(logical.rules, ...ruleIndicesToRemove);
      }
    });
  }
} as OptimizerPlugin;
