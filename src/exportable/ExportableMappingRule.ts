import { fshrules } from 'fsh-sushi';
import { ExportableRule, INDENT_SIZE } from '.';
import { repeat } from 'lodash';

export class ExportableMappingRule extends fshrules.MappingRule implements ExportableRule {
  indent: number;

  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return `${repeat(' ', INDENT_SIZE * (this.indent ?? 0))}${super.toFSH()}`;
  }
}
