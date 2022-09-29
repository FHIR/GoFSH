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
        `The StructureDefinition ${structDef.name} has an element where the id (${input.id}) does not contain ` +
          `the sliceName (${input.sliceName}). The id should contain the sliceName, as specified here: ` +
          `https://www.hl7.org/fhir/elementdefinition.html#id. The sliceName "${sliceNameFromId}" (as implied ` +
          'by the id) will be used.'
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
    // Once both min and max are defined, the CardRule is ready to use.
    let cardRule = CardRuleExtractor.process(input, structDef, fisher, false);
    // if no information was available, the extractor will return null. but we need a rule!
    if (cardRule == null) {
      cardRule = new ExportableCardRule(elementPath);
    }
    // fill in missing information from snapshot
    if (cardRule.min == null || cardRule.max == null) {
      const snapshotElement = structDef.snapshot?.element.find(el => el.id === input.id);
      if (cardRule.min == null && snapshotElement?.min != null) {
        cardRule.min = snapshotElement.min;
      }
      if (cardRule.max == null && snapshotElement?.max != null) {
        cardRule.max = snapshotElement.max;
      }
    }
    // fill in missing information using defaults
    if (cardRule.min == null) {
      cardRule.min = 0;
    }
    if (cardRule.max == null) {
      const slicedElementId = input.id.slice(0, input.id.lastIndexOf(':'));
      const card = getCardinality(slicedElementId, structDef, fisher);
      if (card) {
        cardRule.max = card?.max ?? '*';
      } else {
        // we couldn't find the cardinality of the sliced element, which means this slice is probably not valid
        return null;
      }
    }
    containsRule.cardRules.push(cardRule);
    // FlagRule is optional
    const flagRule = FlagRuleExtractor.process(input);
    if (flagRule) {
      containsRule.flagRules.push(flagRule);
    }
    input.processedPaths.push('sliceName');
    return containsRule;
  }
}
