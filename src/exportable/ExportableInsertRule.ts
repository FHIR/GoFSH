import { InsertRule } from 'fsh-sushi/dist/fshtypes/rules';
import { ExportableRule } from '.';

export class ExportableInsertRule extends InsertRule implements ExportableRule {
  constructor() {
    super();
  }

  toFSH(): string {
    return '// Unimplemented: insert rule';
  }
}
