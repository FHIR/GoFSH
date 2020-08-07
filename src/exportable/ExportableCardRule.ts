import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableCardRule extends fshrules.CardRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  cardToString(): string {
    return `${this.min ?? ''}..${this.max ?? ''}`;
  }

  toFSH(): string {
    return `* ${this.path} ${this.cardToString()}`;
  }
}
