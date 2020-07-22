import { CardRule } from 'fsh-sushi/dist/fshtypes/rules';
import { ElementDefinition } from 'fsh-sushi/dist/fhirtypes';
import { getPath } from '../utils';

export class CardRuleExtractor {
  process(input: ElementDefinition): CardRule | null {
    if (input.min || input.max) {
      const cardRule = new CardRule(getPath(input));
      if (input.min != null) {
        cardRule.min = input.min;
      }
      if (input.max != null) {
        cardRule.max = input.max;
      }
      return cardRule;
    } else {
      return null;
    }
  }
}
