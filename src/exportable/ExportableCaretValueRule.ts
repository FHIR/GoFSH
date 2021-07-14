import { fshrules } from 'fsh-sushi';
import { EOL } from 'os';
import { repeat } from 'lodash';
import { ExportableRule, INDENT_SIZE } from '.';

export class ExportableCaretValueRule extends fshrules.CaretValueRule implements ExportableRule {
  fshComment: string;
  indent = 0;

  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    const lines: string[] = [];
    if (this.fshComment) {
      lines.push(...this.fshComment.split('\n').map(c => `// ${c}`));
    }
    lines.push(`${repeat(' ', INDENT_SIZE * this.indent)}${super.toFSH()}`);
    return lines.join(EOL);
  }
}
