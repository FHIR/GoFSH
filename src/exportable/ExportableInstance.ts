import { Instance } from 'fsh-sushi/dist/fshtypes';
import { Exportable, ExportableFixedValueRule, ExportableInsertRule } from '.';

export class ExportableInstance extends Instance implements Exportable {
  rules: (ExportableFixedValueRule | ExportableInsertRule)[];

  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    return '// Unimplemented: Instance';
  }
}
