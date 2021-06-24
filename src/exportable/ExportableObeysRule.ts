import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableObeysRule extends fshrules.ObeysRule implements ExportableRule {
  keys: string[];
  indent: number;

  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return `* ${this.path === '.' ? '' : `${this.path} `}obeys ${this.keys.join(' and ')}`;
  }
}
