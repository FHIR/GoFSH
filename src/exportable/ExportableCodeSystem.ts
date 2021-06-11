import { fshtypes } from 'fsh-sushi';
import {
  Exportable,
  ExportableCaretValueRule,
  ExportableInsertRule,
  ExportableConceptRule
} from '.';

export class ExportableCodeSystem extends fshtypes.FshCodeSystem implements Exportable {
  rules: (ExportableConceptRule | ExportableCaretValueRule | ExportableInsertRule)[];

  constructor(name: string) {
    super(name);
  }
}
