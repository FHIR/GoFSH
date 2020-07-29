import { CaretValueRule } from 'fsh-sushi/dist/fshtypes/rules';
import { ExportableRule } from '.';

export class ExportableCaretValueRule extends CaretValueRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return '// Unimplemented: caret value rule';
  }
}
