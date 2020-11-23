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
    const inclusionPart = `* ${this.inclusion ? 'include' : 'exclude'} `;
    let conceptPart = this.concepts.map(concept => concept.toString()).join(' and ');
    let fromPart = fromString(this.from);
    // if the result is more than 100 characters long, build it again, but with linebreaks
    if (inclusionPart.length + conceptPart.length + fromPart.length > 100) {
      conceptPart = this.concepts.map(concept => concept.toString()).join(`${EOL}  and `);
      fromPart = `${EOL} ` + fromString(this.from, `${EOL}  and `);
    }
    return `${inclusionPart}${conceptPart}${fromPart}`;
  }
}

export class ExportableValueSetFilterComponentRule extends fshrules.ValueSetFilterComponentRule
  implements ExportableRule {
  constructor(inclusion: boolean) {
    super(inclusion);
  }

  toFSH() {
    const inclusionPart = `* ${this.inclusion ? 'include' : 'exclude'} codes`;
    let fromPart = fromString(this.from);
    let filterPart = this.buildFilterString();
    // if the result is more than 100 characters long, build it again, but with linebreaks
    if (inclusionPart.length + fromPart.length + filterPart.length > 100) {
      fromPart = fromString(this.from, `${EOL}  and `);
      filterPart = `${EOL} ` + this.buildFilterString(`${EOL}  and `);
    }
    return `${inclusionPart}${fromPart}${filterPart}`;
  }

  private buildFilterString(separator = ' and '): string {
    if (this.filters.length) {
      return (
        ' where ' +
        this.filters
          .map(
            filter =>
              `${filter.property} ${filter.operator} ${
                typeof filter.value === 'string'
                  ? `"${filter.value.toString()}"`
                  : filter.value.toString()
              }`
          )
          .join(separator)
      );
    } else {
      return '';
    }
  }
}

function fromString(from: fshtypes.ValueSetComponentFrom, separator = ' and ') {
  if (from.system == null && from.valueSets == null) return '';
  let fromString = ' from ';
  if (from.system) {
    fromString += `system ${from.system}`;
  }
  if (from.valueSets) {
    fromString += `${from.system ? separator : ''}valueset ${from.valueSets.join(separator)}`;
  }
  return fromString;
}
