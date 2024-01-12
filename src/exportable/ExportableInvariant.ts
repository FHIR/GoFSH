import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableAssignmentRule, ExportableInsertRule } from '.';

export class ExportableInvariant extends fshtypes.Invariant implements Exportable {
  rules: (ExportableAssignmentRule | ExportableInsertRule)[];

  constructor(name: string) {
    super(name);
  }
}
