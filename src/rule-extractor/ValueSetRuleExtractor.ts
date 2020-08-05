import { fhirtypes } from 'fsh-sushi';
import { getPath } from '../utils';
import { ExportableValueSetRule } from '../exportable';

export class ValueSetRuleExtractor {
  static process(input: fhirtypes.ElementDefinition): ExportableValueSetRule | null {
    if (input.binding?.valueSet) {
      const valueSetRule = new ExportableValueSetRule(getPath(input));
      valueSetRule.valueSet = input.binding.valueSet;
      valueSetRule.strength = input.binding.strength;
      return valueSetRule;
    } else {
      return null;
    }
  }
}
