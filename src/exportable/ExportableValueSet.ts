import { EOL } from 'os';
import { fshtypes } from 'fsh-sushi';
import { metadataToFSH } from './common';
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
    const metadataFSH = metadataToFSH(this);
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
