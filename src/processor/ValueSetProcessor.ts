import { capitalize } from 'lodash';
import { ExportableValueSet } from '../exportable';

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

  static process(input: any): ExportableValueSet {
    // We need something to call the ValueSet, so it must have a name or id
    if (input.name != null || input.id != null) {
      // Prefer name (which is optional), otherwise create a reasonable name from the id with only allowable characters
      const name = input.name ?? input.id.split(/[-.]+/).map(capitalize).join('');
      const valueSet = new ExportableValueSet(name);
      ValueSetProcessor.extractKeywords(input, valueSet);
      return valueSet;
    }
  }
}
