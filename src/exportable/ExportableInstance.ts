import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableAssignmentRule, ExportableInsertRule } from '.';

export class ExportableInstance extends fshtypes.Instance implements Exportable {
  rules: (ExportableAssignmentRule | ExportableInsertRule)[];

  constructor(name: string) {
    super(name);
  }
}
