import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableObeysRule extends fshrules.ObeysRule implements ExportableRule {
  keys: string[];

  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return '// Unimplemented: obeys rule';
  }
}
