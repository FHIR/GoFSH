import { ObeysRule } from 'fsh-sushi/dist/fshtypes/rules';
import { ExportableRule } from '.';

export class ExportableObeysRule extends ObeysRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return '// Unimplemented: obeys rule';
  }
}
