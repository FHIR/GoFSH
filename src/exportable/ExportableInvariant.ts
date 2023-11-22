import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableAssignmentRule, ExportableInsertRule } from '.';
import { fshifyString } from './common';
import { EOL } from 'os';

export class ExportableInvariant extends fshtypes.Invariant implements Exportable {
  rules: (ExportableAssignmentRule | ExportableInsertRule)[];

  constructor(name: string) {
    super(name);
  }

  metadataToFSH(): string {
    const resultLines: string[] = [];
    resultLines.push(`Invariant: ${this.name}`);
    if (this.description) {
      // Description can be a multiline string.
      // If it contains newline characters, treat it as a multiline string.
      if (this.description.indexOf('\n') > -1) {
        resultLines.push(`Description: """${this.description}"""`);
      } else {
        resultLines.push(`Description: "${fshifyString(this.description)}"`);
      }
    }
    if (this.severity) {
      resultLines.push(`* severity = ${this.severity}`);
    }
    if (this.expression) {
      resultLines.push(`* expression = "${fshifyString(this.expression)}"`);
    }
    if (this.xpath) {
      resultLines.push(`* xpath = "${fshifyString(this.xpath)}"`);
    }
    return resultLines.join(EOL);
  }
}
