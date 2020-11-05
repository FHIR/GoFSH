import { utils } from 'fsh-sushi';
import { ProcessableElementDefinition, ProcessableStructureDefinition } from '../processor';
import { ExportableCardRule, ExportableContainsRule } from '../exportable';
import { getPath, getCardinality } from '../utils';
import { CardRuleExtractor } from './CardRuleExtractor';
import { FlagRuleExtractor } from './FlagRuleExtractor';

export class ContainsRuleExtractor {
  static process(
    input: ProcessableElementDefinition,
    structDef: ProcessableStructureDefinition,
    fisher: utils.Fishable
  ): ExportableContainsRule {
    // The path for the rule should not include the slice for the contained element,
    // but should include previous slices.
    const elementPath = getPath(input);
    const rulePath = elementPath.replace(RegExp(`\\[${input.sliceName}\\]$`), '');
    const containsRule = new ExportableContainsRule(rulePath);
    containsRule.items.push({
      name: input.sliceName
    });
    // CardRule is required, so if it isn't present, we don't get a ContainsRule
    const cardRule = CardRuleExtractor.process(input, structDef, fisher, false);
    if (cardRule) {
      containsRule.cardRules.push(cardRule);
    } else {
      const slicedElementId = input.id.slice(0, input.id.lastIndexOf(':'));
      const card = getCardinality(slicedElementId, structDef, fisher);
      if (card) {
        const cardRule = new ExportableCardRule(elementPath);
        cardRule.min = card.min;
        cardRule.max = card.max;
        containsRule.cardRules.push(cardRule);
      } else {
        return null;
      }
    }
    // FlagRule is optional
    const flagRule = FlagRuleExtractor.process(input);
    if (flagRule) {
      containsRule.flagRules.push(flagRule);
    }
    input.processedPaths.push('sliceName');
    return containsRule;
  }
}
