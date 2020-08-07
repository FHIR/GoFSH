import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableCaretValueRule extends fshrules.CaretValueRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return '// Unimplemented: caret value rule';
  }
}
