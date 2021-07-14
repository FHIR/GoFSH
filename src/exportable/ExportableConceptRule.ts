import { fshrules } from 'fsh-sushi';
import { ExportableRule, INDENT_SIZE } from '.';
import { repeat } from 'lodash';

export class ExportableConceptRule extends fshrules.ConceptRule implements ExportableRule {
  indent = 0;

  constructor(code: string, display?: string, definition?: string) {
    super(code, display, definition);
  }

  toFSH(): string {
    return `${repeat(' ', INDENT_SIZE * this.indent)}${super.toFSH()}`;
  }
}
