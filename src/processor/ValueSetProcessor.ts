import { utils } from 'fsh-sushi';
import { capitalize, compact } from 'lodash';
import { ExportableValueSet } from '../exportable';
import { CaretValueRuleExtractor } from '../extractor';

export class ValueSetProcessor {
  static extractKeywords(input: any, target: ExportableValueSet): void {
    if (input.id) {
      target.id = input.id;
    }
    if (input.title) {
      target.title = input.title;
    }
    if (input.description) {
      target.description = input.description;
    }
  }

  static extractRules(input: any, target: ExportableValueSet, fisher: utils.Fishable): void {
    const newRules: ExportableValueSet['rules'] = [];
    newRules.push(...CaretValueRuleExtractor.processResource(input, fisher, input.resourceType));
    target.rules = compact(newRules);
  }

  static process(input: any, fisher: utils.Fishable): ExportableValueSet {
    // We need something to call the ValueSet, so it must have a name or id
    if (input.name != null || input.id != null) {
      // Prefer name (which is optional), otherwise create a reasonable name from the id with only allowable characters
      const name = input.name ?? input.id.split(/[-.]+/).map(capitalize).join('');
      const valueSet = new ExportableValueSet(name);
      ValueSetProcessor.extractKeywords(input, valueSet);
      ValueSetProcessor.extractRules(input, valueSet, fisher);
      return valueSet;
    }
  }
}
