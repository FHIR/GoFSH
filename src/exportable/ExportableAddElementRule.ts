import { fshrules } from 'fsh-sushi';
import { repeat } from 'lodash';
import { ExportableRule, INDENT_SIZE } from '.';

export class ExportableAddElementRule extends fshrules.AddElementRule implements ExportableRule {
  indent = 0;

  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return `${repeat(' ', INDENT_SIZE * this.indent)}${super.toFSH()}`;
  }
}
