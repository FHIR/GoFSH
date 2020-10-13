import { getPath } from '../utils';
import { ExportableBindingRule } from '../exportable';
import { ProcessableElementDefinition } from '../processor';

export class BindingRuleExtractor {
  static process(input: ProcessableElementDefinition): ExportableBindingRule | null {
    if (input.binding?.valueSet) {
      const bindingRule = new ExportableBindingRule(getPath(input));
      bindingRule.valueSet = input.binding.valueSet;
      bindingRule.strength = input.binding.strength;
      input.processedPaths.push('binding.valueSet', 'binding.strength');
      return bindingRule;
    } else {
      return null;
    }
  }
}
