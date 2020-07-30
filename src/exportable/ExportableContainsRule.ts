import { ContainsRule } from 'fsh-sushi/dist/fshtypes/rules';
import { ExportableRule } from '.';

export class ExportableContainsRule extends ContainsRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return '// Unimplemented: contains rule';
  }
}
