import { capitalize, compact } from 'lodash';
import { ExportableValueSet } from '../exportable';
import { ValueSetConceptComponentRuleExtractor } from '../extractor';

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

  static extractRules(input: ProcessableValueSet, target: ExportableValueSet): void {
    if (input.compose) {
      input.compose.include?.forEach((vsComponent: any) =>
        ValueSetProcessor.extractValueSetComponentRules(vsComponent, target, true)
      );
      input.compose.exclude?.forEach((vsComponent: any) =>
        ValueSetProcessor.extractValueSetComponentRules(vsComponent, target, false)
      );
    }
    target.rules = compact(target.rules);
  }

  static extractValueSetComponentRules(
    vsComponent: any,
    target: ExportableValueSet,
    include: boolean
  ) {
    target.rules.push(ValueSetConceptComponentRuleExtractor.process(vsComponent, include));
  }

  static process(input: any): ExportableValueSet {
    // We need something to call the ValueSet, so it must have a name or id
    if (ValueSetProcessor.isProcessableValueSet(input)) {
      // Prefer name (which is optional), otherwise create a reasonable name from the id with only allowable characters
      const name = input.name ?? input.id.split(/[-.]+/).map(capitalize).join('');
      const valueSet = new ExportableValueSet(name);
      ValueSetProcessor.extractKeywords(input, valueSet);
      ValueSetProcessor.extractRules(input, valueSet);
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
