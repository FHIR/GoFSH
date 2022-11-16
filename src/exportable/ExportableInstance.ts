import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableAssignmentRule, ExportableInsertRule, ExportablePathRule } from '.';

export class ExportableInstance extends fshtypes.Instance implements Exportable {
  //@ts-ignore
  rules: (ExportableAssignmentRule | ExportableInsertRule | ExportablePathRule)[];

  constructor(name: string) {
    super(name);
  }
}
