import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableInsertRule extends fshrules.InsertRule implements ExportableRule {
  indent: number;

  constructor() {
    super();
  }

  toFSH(): string {
    return '// Unimplemented: insert rule';
  }
}
