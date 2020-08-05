import { fshtypes } from 'fsh-sushi';
import {
  Exportable,
  ExportableCaretValueRule,
  ExportableInsertRule,
  ExportableValueSetComponentRule
} from '.';

export class ExportableValueSet extends fshtypes.FshValueSet implements Exportable {
  rules: (ExportableValueSetComponentRule | ExportableCaretValueRule | ExportableInsertRule)[];

  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    return '// Unimplemented: ValueSet';
  }
}
