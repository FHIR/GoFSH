import { fhirtypes } from 'fsh-sushi';
import { ExportableCardRule } from '../exportable';
import { getPath } from '../utils';

export class CardRuleExtractor {
  static process(input: fhirtypes.ElementDefinition): ExportableCardRule | null {
    if (input.min || input.max) {
      const cardRule = new ExportableCardRule(getPath(input));
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
