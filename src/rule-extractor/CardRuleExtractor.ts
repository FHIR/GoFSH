import { ProcessableElementDefinition } from '../processor';
import { ExportableCardRule } from '../exportable';
import { getPath } from '../utils';

export class CardRuleExtractor {
  static process(input: ProcessableElementDefinition): ExportableCardRule | null {
    if (input.min || input.max) {
      const cardRule = new ExportableCardRule(getPath(input));
      if (input.min != null) {
        cardRule.min = input.min;
        input.processedPaths.push('min');
      }
      if (input.max != null) {
        cardRule.max = input.max;
        input.processedPaths.push('max');
      }
      return cardRule;
    } else {
      return null;
    }
  }
}
