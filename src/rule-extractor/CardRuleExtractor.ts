import { ElementDefinition } from 'fsh-sushi/dist/fhirtypes';
import { ExportableCardRule } from '../exportable';
import { getPath } from '../utils';

export class CardRuleExtractor {
  process(input: ElementDefinition): ExportableCardRule | null {
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
