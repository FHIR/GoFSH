import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableConceptRule extends fshrules.ConceptRule implements ExportableRule {
  constructor(code: string, display?: string, definition?: string) {
    super(code, display, definition);
  }

  toFSH(): string {
    let line = `* #${this.code}`;
    if (this.display) {
      line += ` "${this.display}"`;
    }
    if (this.definition) {
      // If there is no display, a definition must be specified with triple quotes
      // so that it is correctly differentiated from a display by sushi
      const quotes = this.display ? '"' : '"""';
      line += ` ${quotes}${this.definition}${quotes}`;
    }
    return line;
  }
}
