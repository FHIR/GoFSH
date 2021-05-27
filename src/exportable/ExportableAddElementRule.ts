import { fshrules } from 'fsh-sushi';
import { Exportable } from './Exportable';

export class ExportableAddElementRule extends fshrules.AddElementRule implements Exportable {
  toFSH(): string {
    return '// not yet implemented: AddElementRule';
  }
}
