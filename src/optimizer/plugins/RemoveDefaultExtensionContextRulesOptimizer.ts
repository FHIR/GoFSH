import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableCaretValueRule } from '../../exportable';
import { isEqual, pullAt } from 'lodash';
import { fshtypes } from 'fsh-sushi';
const { FshCode } = fshtypes;

export default {
  name: 'remove_default_extension_context_rules',
  description: 'Remove extension contexts matching the default context that SUSHI generates',

  optimize(pkg: Package): void {
    // * ^context[0].type = #element
    const DEFAULT_TYPE = new ExportableCaretValueRule('');
    DEFAULT_TYPE.caretPath = 'context[0].type';
    DEFAULT_TYPE.value = new FshCode('element');
    // * ^context[0].expression = "Element"
    const DEFAULT_EXPRESSION = new ExportableCaretValueRule('');
    DEFAULT_EXPRESSION.caretPath = 'context[0].expression';
    DEFAULT_EXPRESSION.value = 'Element';
    // Loop through extensions looking for the default context type (and removing it)
    pkg.extensions.forEach(sd => {
      const numContexts = sd.rules.filter(
        r =>
          r instanceof ExportableCaretValueRule &&
          r.path === '' &&
          /^context\[\d+]\.type$/.test(r.caretPath)
      ).length;
      if (numContexts === 1) {
        const typeRuleIdx = sd.rules.findIndex(r => isEqual(r, DEFAULT_TYPE));
        const expressionRuleIdx = sd.rules.findIndex(r => isEqual(r, DEFAULT_EXPRESSION));
        if (typeRuleIdx !== -1 && expressionRuleIdx !== -1) {
          pullAt(sd.rules, [typeRuleIdx, expressionRuleIdx]);
        }
      }
    });
  }
} as OptimizerPlugin;
