import { ElementDefinition } from 'fsh-sushi/dist/fhirtypes';
import { getPath } from '../utils';
import { ExportableValueSetRule } from '../exportable';

export class ValueSetRuleExtractor {
  process(input: ElementDefinition): ExportableValueSetRule | null {
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
