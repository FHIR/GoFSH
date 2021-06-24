import { fshrules } from 'fsh-sushi';
import { Exportable } from '.';

export interface ExportableRule extends Exportable, fshrules.Rule {
  indent: number;
}
