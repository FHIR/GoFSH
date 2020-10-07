import { getPath } from '../utils';
import { ExportableValueSetRule } from '../exportable';
import { ProcessableElementDefinition } from '../processor';

export class ValueSetRuleExtractor {
  static process(input: ProcessableElementDefinition): ExportableValueSetRule | null {
    if (input.binding?.valueSet) {
      const valueSetRule = new ExportableValueSetRule(getPath(input));
      valueSetRule.valueSet = input.binding.valueSet;
      valueSetRule.strength = input.binding.strength;
      input.processedPaths.push('binding.valueSet', 'binding.strength');
      return valueSetRule;
    } else {
      return null;
    }
  }
}
