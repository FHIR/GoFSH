import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableFixedValueRule extends fshrules.FixedValueRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return '// Unimplemented: fixed value rule';
  }
}
