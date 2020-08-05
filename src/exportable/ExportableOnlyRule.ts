import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableOnlyRule extends fshrules.OnlyRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return '// Unimplemented: only rule';
  }
}
