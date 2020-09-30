import { EOL } from 'os';
import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableSdRule, ExportableInvariant } from '.';
import { metadataToFSH } from './common';

export class ExportableProfile extends fshtypes.Profile implements Exportable {
  rules: ExportableSdRule[];
  invariants: ExportableInvariant[];

  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    const metadataFSH = metadataToFSH(this);
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
