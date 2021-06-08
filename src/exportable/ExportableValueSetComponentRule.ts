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
    // if this rule has valueSets in its "from" definition, write using the typical syntax
    // otherwise, write each code on its own line, and omit "include" and "from system"
    if (this.from.valueSets?.length > 0) {
      const inclusionPart = `* ${this.inclusion ? 'include' : 'exclude'} `;
      let conceptPart = this.concepts.map(concept => concept.toString()).join(' and ');
      let fromPart = fromString(this.from);
      // if the result is more than 100 characters long, build it again, but with linebreaks
      if (inclusionPart.length + conceptPart.length + fromPart.length > 100) {
        conceptPart = this.concepts.map(concept => concept.toString()).join(` and${EOL}    `);
        fromPart = `${EOL}   ` + fromString(this.from, ` and${EOL}    `);
      }
      return `${inclusionPart}${conceptPart}${fromPart}`;
    } else {
      const inclusionPart = `* ${this.inclusion ? '' : 'exclude '}`;
      return this.concepts
        .map(concept => {
          if (!concept.system && this.from.system) {
            concept.system = this.from.system;
          }

          return `${inclusionPart}${concept}`;
        })
        .join(EOL);
    }
  }
}

export class ExportableValueSetFilterComponentRule extends fshrules.ValueSetFilterComponentRule
  implements ExportableRule {
  constructor(inclusion: boolean) {
    super(inclusion);
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
