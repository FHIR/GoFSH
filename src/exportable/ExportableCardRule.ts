import { CardRule } from 'fsh-sushi/dist/fshtypes/rules';
import { ExportableRule } from '.';

export class ExportableCardRule extends CardRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return `* ${this.path} ${this.min ?? ''}..${this.max ?? ''}`;
  }
}
