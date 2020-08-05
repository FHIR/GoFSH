import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableCardRule extends fshrules.CardRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return `* ${this.path} ${this.min ?? ''}..${this.max ?? ''}`;
  }
}
