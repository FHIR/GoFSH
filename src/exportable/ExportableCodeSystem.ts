import { EOL } from 'os';
import { fshtypes } from 'fsh-sushi';
import { metadataToFSH } from './common';
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

  toFSH(): string {
    const metadataFSH = metadataToFSH(this);
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
