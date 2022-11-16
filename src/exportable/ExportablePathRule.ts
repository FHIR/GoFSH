import { fshrules } from 'fsh-sushi';
import { ExportableRule, INDENT_SIZE } from '.';
import { repeat } from 'lodash';

export class ExportablePathRule extends fshrules.Rule implements ExportableRule {
  indent = 0;

  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return `${repeat(' ', INDENT_SIZE * this.indent)}* ${this.path}`;
  }
}
