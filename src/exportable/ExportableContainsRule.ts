import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableContainsRule extends fshrules.ContainsRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return '// Unimplemented: contains rule';
  }
}
