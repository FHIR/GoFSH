import { fshrules } from 'fsh-sushi';
import { ExportableRule, INDENT_SIZE } from '.';
import { repeat } from 'lodash';

export class ExportableObeysRule extends fshrules.ObeysRule implements ExportableRule {
  keys: string[];
  indent: number;

  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return `${repeat(' ', INDENT_SIZE * (this.indent ?? 0))}* ${
      this.path === '.' || this.path === '' ? '' : `${this.path} `
    }obeys ${this.keys.join(' and ')}`;
  }
}
