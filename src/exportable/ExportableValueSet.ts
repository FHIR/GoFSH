import { FshValueSet } from 'fsh-sushi/dist/fshtypes';
import {
  Exportable,
  ExportableCaretValueRule,
  ExportableInsertRule,
  ExportableValueSetComponentRule
} from '.';

export class ExportableValueSet extends FshValueSet implements Exportable {
  rules: (ExportableValueSetComponentRule | ExportableCaretValueRule | ExportableInsertRule)[];

  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    return '// Unimplemented: ValueSet';
  }
}
