import { fshrules } from 'fsh-sushi';
import { fshifyString } from './common';
import { ExportableRule } from '.';

export class ExportableConceptRule extends fshrules.ConceptRule implements ExportableRule {
  constructor(code: string, display?: string, definition?: string) {
    super(code, display, definition);
  }

  toFSH(): string {
    let line = `* #${this.code.includes(' ') ? `"${this.code}"` : this.code}`;
    if (this.display) {
      line += ` "${fshifyString(this.display)}"`;
    }
    if (this.definition) {
      // If there is no display, a definition must be specified with triple quotes
      // so that it is correctly differentiated from a display by sushi
      const quotes = this.display ? '"' : '"""';
      line += ` ${quotes}${fshifyString(this.definition)}${quotes}`;
    }
    return line;
  }
}
