import { ValueSetRule } from 'fsh-sushi/dist/fshtypes/rules';
import { ElementDefinition } from 'fsh-sushi/dist/fhirtypes';
import { getPath } from '../utils';

export class ValueSetRuleExtractor {
  process(input: ElementDefinition): ValueSetRule | null {
    if (input.binding?.valueSet) {
      const valueSetRule = new ValueSetRule(getPath(input));
      valueSetRule.valueSet = input.binding.valueSet;
      valueSetRule.strength = input.binding.strength;
      return valueSetRule;
    } else {
      return null;
    }
  }
}
