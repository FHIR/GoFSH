import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableCaretValueRule } from '../../exportable';
import { isEqual, pullAt } from 'lodash';

export default {
  name: 'remove_default_resource_caret_rules_optimizer',
  description:
    'Remove caret rules on a Resource that provide values that will be provided by default SUSHI behavior',
  optimize(pkg: Package): void {
    // * ^abstract = false
    const DEFAULT_ABSTRACT = new ExportableCaretValueRule('');
    DEFAULT_ABSTRACT.caretPath = 'abstract';
    DEFAULT_ABSTRACT.value = false;
    // * ^type = {the Resource's id}
    const DEFAULT_TYPE = new ExportableCaretValueRule('');
    DEFAULT_TYPE.caretPath = 'type';
    // check for these on Resources
    pkg.resources.forEach(resource => {
      const ruleIndicesToRemove: number[] = [];
      DEFAULT_TYPE.value = resource.id;
      resource.rules.forEach((rule, idx) => {
        if (
          rule instanceof ExportableCaretValueRule &&
          (isEqual(rule, DEFAULT_ABSTRACT) || isEqual(rule, DEFAULT_TYPE))
        ) {
          ruleIndicesToRemove.push(idx);
        }
      });
      if (ruleIndicesToRemove.length > 0) {
        pullAt(resource.rules, ...ruleIndicesToRemove);
      }
    });
  }
} as OptimizerPlugin;
