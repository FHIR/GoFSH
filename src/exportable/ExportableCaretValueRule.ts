import { fshrules } from 'fsh-sushi';
import { EOL } from 'os';
import { ExportableRule } from '.';

export class ExportableCaretValueRule extends fshrules.CaretValueRule implements ExportableRule {
  fshComment: string;
  indent: number;

  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    const lines: string[] = [];
    if (this.fshComment) {
      lines.push(...this.fshComment.split('\n').map(c => `// ${c}`));
    }
    lines.push(super.toFSH());
    return lines.join(EOL);
  }
}
