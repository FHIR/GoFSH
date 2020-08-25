import { fhirtypes } from 'fsh-sushi';
import { ExportableContainsRule } from '../exportable';
import { getPath } from '../utils';
import { CardRuleExtractor } from './CardRuleExtractor';
import { FlagRuleExtractor } from './FlagRuleExtractor';

export class ContainsRuleExtractor {
  static process(input: fhirtypes.ElementDefinition): ExportableContainsRule {
    // The path for the rule should not include the slice for the contained element,
    // but should include previous slices.
    const elementPath = getPath(input);
    const rulePath = elementPath.replace(RegExp(`\\[${input.sliceName}\\]$`), '');
    const containsRule = new ExportableContainsRule(rulePath);
    containsRule.items.push({
      name: input.sliceName
    });
    // CardRule is required, so if it isn't present, we don't get a ContainsRule
    const cardRule = CardRuleExtractor.process(input);
    if (cardRule) {
      containsRule.cardRules.push(cardRule);
    } else {
      return null;
    }
    // FlagRule is optional
    const flagRule = FlagRuleExtractor.process(input);
    if (flagRule) {
      containsRule.flagRules.push(flagRule);
    }
    return containsRule;
  }
}
