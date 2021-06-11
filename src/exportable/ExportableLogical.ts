import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableSdRule, ExportableAddElementRule } from '.';

export class ExportableLogical extends fshtypes.Resource implements Exportable {
  rules: (ExportableSdRule | ExportableAddElementRule)[];

  constructor(name: string) {
    super(name);
  }
}
