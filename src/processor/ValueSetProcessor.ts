import { utils } from 'fsh-sushi';
import { capitalize, compact } from 'lodash';
import { ExportableValueSet } from '../exportable';
import { ValueSetConceptComponentRuleExtractor, CaretValueRuleExtractor } from '../extractor';

export class ValueSetProcessor {
  static extractKeywords(input: ProcessableValueSet, target: ExportableValueSet): void {
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
    if (input.compose) {
      input.compose.include?.forEach((vsComponent: any) =>
        newRules.push(ValueSetConceptComponentRuleExtractor.process(vsComponent, true))
      );
      input.compose.exclude?.forEach((vsComponent: any) =>
        newRules.push(ValueSetConceptComponentRuleExtractor.process(vsComponent, false))
      );
    }
    target.rules = compact(newRules);
  }

  static process(input: any, fisher: utils.Fishable): ExportableValueSet {
    // We need something to call the ValueSet, so it must have a name or id
    if (ValueSetProcessor.isProcessableValueSet(input)) {
      // Prefer name (which is optional), otherwise create a reasonable name from the id with only allowable characters
      const name = input.name ?? input.id.split(/[-.]+/).map(capitalize).join('');
      const valueSet = new ExportableValueSet(name);
      ValueSetProcessor.extractKeywords(input, valueSet);
      ValueSetProcessor.extractRules(input, valueSet, fisher);
      return valueSet;
    }
  }

  // by FHIR spec, if the include list exists, it must contain at least one element
  // but we can still do some processing without that.
  // see http://hl7.org/fhir/r4/valueset-definitions.html#ValueSet.compose.include
  static isProcessableValueSet(input: any): input is ProcessableValueSet {
    return input.name != null || input.id != null;
  }
}

interface ProcessableValueSet {
  name?: string;
  id?: string;
  title?: string;
  description?: string;
  compose?: {
    include?: any;
    exclude?: any;
  };
}
