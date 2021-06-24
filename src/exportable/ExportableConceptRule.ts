import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableConceptRule extends fshrules.ConceptRule implements ExportableRule {
  indent: number;

  constructor(code: string, display?: string, definition?: string) {
    super(code, display, definition);
  }
}
