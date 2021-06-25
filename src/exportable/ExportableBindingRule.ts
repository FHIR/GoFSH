import { fshrules } from 'fsh-sushi';
import { repeat } from 'lodash';
import { ExportableRule, INDENT_SIZE } from '.';

export class ExportableBindingRule extends fshrules.BindingRule implements ExportableRule {
  indent: number;

  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return `${repeat(' ', INDENT_SIZE * (this.indent ?? 0))}${super.toFSH()}`;
  }
}
