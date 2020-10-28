import { fshrules, fshtypes } from 'fsh-sushi';
import { ExportableRule } from '.';

export type ExportableValueSetComponentRule =
  | ExportableValueSetConceptComponentRule
  | ExportableValueSetFilterComponentRule;

export class ExportableValueSetConceptComponentRule extends fshrules.ValueSetConceptComponentRule
  implements ExportableRule {
  constructor(inclusion: boolean) {
    super(inclusion);
  }

  toFSH() {
    let fsh = `* ${this.inclusion ? 'include' : 'exclude'} `;
    fsh += this.concepts.map(concept => concept.toString()).join(' and ');
    fsh += fromString(this.from);
    return fsh;
  }
}

export class ExportableValueSetFilterComponentRule extends fshrules.ValueSetFilterComponentRule
  implements ExportableRule {
  constructor(inclusion: boolean) {
    super(inclusion);
  }

  toFSH() {
    let fsh = `* ${this.inclusion ? 'include' : 'exclude'} codes`;
    fsh += fromString(this.from);
    fsh += `${this.filters.length ? ' where ' : ''}`;
    fsh += this.filters
      .map(
        filter =>
          `${filter.property} ${filter.operator} ${
            typeof filter.value === 'string'
              ? `"${filter.value.toString()}"`
              : filter.value.toString()
          }`
      )
      .join(' and ');
    return fsh;
  }
}

function fromString(from: fshtypes.ValueSetComponentFrom) {
  if (from.system == null && from.valueSets == null) return '';

  let fromString = ' from ';
  if (from.system) {
    fromString += `system ${from.system}`;
  }
  if (from.valueSets) {
    fromString += `${from.system ? ' and ' : ''}valueset ${from.valueSets.join(' and ')}`;
  }
  return fromString;
}
