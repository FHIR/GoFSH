import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableCardRule extends fshrules.CardRule implements ExportableRule {
  indent: number;

  constructor(path: string) {
    super(path);
  }
}
