import { EOL } from 'os';
import { fshtypes } from 'fsh-sushi';
import { metadataToFSH } from './common';
import { Exportable, ExportableAssignmentRule, ExportableInsertRule } from '.';

export class ExportableInstance extends fshtypes.Instance implements Exportable {
  rules: (ExportableAssignmentRule | ExportableInsertRule)[];

  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    const metadataFSH = metadataToFSH(this);
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
