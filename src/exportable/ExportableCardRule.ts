import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableCardRule extends fshrules.CardRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }
}
