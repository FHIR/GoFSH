import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableSdRule, ExportableAddElementRule } from '.';
import { metadataToFSH } from './common';
import { EOL } from 'os';

export class ExportableLogical extends fshtypes.Resource implements Exportable {
  rules: (ExportableSdRule | ExportableAddElementRule)[];

  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    const metadataFSH = metadataToFSH(this);
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
