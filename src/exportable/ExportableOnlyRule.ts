import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableOnlyRule extends fshrules.OnlyRule implements ExportableRule {
  indent: number;

  constructor(path: string) {
    super(path);
  }
}
