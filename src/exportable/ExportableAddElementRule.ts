import { fshrules } from 'fsh-sushi';
import { Exportable } from './Exportable';

export class ExportableAddElementRule extends fshrules.AddElementRule implements Exportable {
  constructor(path: string) {
    super(path);
  }
}
