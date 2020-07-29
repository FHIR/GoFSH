import { EOL } from 'os';
import { Extension } from 'fsh-sushi/dist/fshtypes';
import { Exportable, ExportableSdRule } from '.';
import { metadataToFSH } from './common';

export class ExportableExtension extends Extension implements Exportable {
  rules: ExportableSdRule[];

  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    const metadataFSH = metadataToFSH(this);
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
