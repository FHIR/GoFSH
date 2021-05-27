import { ProcessableElementDefinition } from '../processor';
import { ExportableAddElementRule } from '../exportable';
import { getPath } from '../utils';
import { FlagRuleExtractor } from '.';
import { OnlyRuleExtractor } from './OnlyRuleExtractor';

export class AddElementRuleExtractor {
  static process(input: ProcessableElementDefinition): ExportableAddElementRule {
    const addElementRule = new ExportableAddElementRule(getPath(input));
    // we always have cardinality
    // don't use CardRuleExtractor here, since that has extra logic
    // that we don't want to use.
    addElementRule.min = input.min;
    addElementRule.max = input.max;
    input.processedPaths.push('min', 'max');
    // get types using OnlyRuleExtractor
    addElementRule.types = OnlyRuleExtractor.process(input)?.types;
    // we might have flags, so use FlagRuleExtractor
    const flagRule = FlagRuleExtractor.process(input);
    if (flagRule) {
      Object.assign(addElementRule, flagRule);
    }
    // we might have short and definition
    if (input.short) {
      addElementRule.short = input.short;
      input.processedPaths.push('short');
    }
    if (input.definition) {
      addElementRule.definition = input.definition;
      input.processedPaths.push('definition');
    }
    return addElementRule;
  }
}
