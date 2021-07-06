import { utils } from 'fsh-sushi';
import { ProcessableElementDefinition, ProcessableStructureDefinition } from '../processor';
import { ExportableCardRule, ExportableContainsRule } from '../exportable';
import { getPath, getCardinality } from '../utils';
import { CardRuleExtractor } from './CardRuleExtractor';
import { FlagRuleExtractor } from './FlagRuleExtractor';
import { logger } from '../utils';

export class ContainsRuleExtractor {
  static process(
    input: ProcessableElementDefinition,
    structDef: ProcessableStructureDefinition,
    fisher: utils.Fishable
  ): ExportableContainsRule {
    // The path for the rule should not include the slice for the contained element,
    // but should include previous slices.
    const elementPath = getPath(input);
    const sliceNameFromId = input.id.match(/[:/]([^:/]+)$/)?.[1];
    if (sliceNameFromId !== input.sliceName) {
      logger.error(
        `Element sliceName "${input.sliceName}" is not correctly used to populate id "${input.id}" according to ` +
          'the algorithm specified here: https://www.hl7.org/fhir/elementdefinition.html#id. ' +
          'The value implied by the id will be used.'
      );
    }
    const rulePath = elementPath.replace(RegExp(`\\[${sliceNameFromId}\\]$`), '');
    const containsRule = new ExportableContainsRule(rulePath);
    containsRule.items.push({
      name: sliceNameFromId
    });
    // CardRule is required, so try our best to get correct cardinality information
    // 1. Check the element differential
    // 2. Check the element snapshot
    // 3. Use defaults: min = 0, max = sliced element's max
    const cardRule = CardRuleExtractor.process(input, structDef, fisher, false);
    if (cardRule) {
      containsRule.cardRules.push(cardRule);
    } else {
      // can we get information from the snapshot?
      const snapshotElement = structDef.snapshot?.element.find(el => el.id === input.id);
      if (snapshotElement?.min != null || snapshotElement?.max != null) {
        const cardRule = new ExportableCardRule(elementPath);
        cardRule.min = snapshotElement.min;
        cardRule.max = snapshotElement.max;
        containsRule.cardRules.push(cardRule);
      } else {
        // use defaults, which means check the sliced element's max
        const slicedElementId = input.id.slice(0, input.id.lastIndexOf(':'));
        const card = getCardinality(slicedElementId, structDef, fisher);
        if (card) {
          const cardRule = new ExportableCardRule(elementPath);
          cardRule.min = 0;
          cardRule.max = card.max;
          containsRule.cardRules.push(cardRule);
        } else {
          return null;
        }
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
