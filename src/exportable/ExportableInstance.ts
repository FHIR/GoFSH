import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableFixedValueRule, ExportableInsertRule } from '.';

export class ExportableInstance extends fshtypes.Instance implements Exportable {
  rules: (ExportableFixedValueRule | ExportableInsertRule)[];

  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    return '// Unimplemented: Instance';
  }
}
