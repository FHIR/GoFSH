import { EOL } from 'os';
import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableSdRule } from '.';
import { metadataToFSH, switchQuantityRules } from './common';

export class ExportableExtension extends fshtypes.Extension implements Exportable {
  rules: ExportableSdRule[];

  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    switchQuantityRules(this);
    const metadataFSH = metadataToFSH(this);
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
