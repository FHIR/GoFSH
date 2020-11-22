import { EOL } from 'os';
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
    // if the result is more than 100 characters long, break it up
    if (fsh.length > 100) {
      fsh = fsh.replace(/ (and|from) /g, `${EOL}  $1 `);
    }
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
    // if the result is more than 100 characters long, break it up
    if (fsh.length > 100) {
      fsh = fsh.replace(/ (and|where) /g, `${EOL}  $1 `);
    }
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
