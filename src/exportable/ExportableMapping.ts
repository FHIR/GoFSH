import { EOL } from 'os';
import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableMappingRule, ExportableInsertRule } from '.';
import { metadataToFSH } from './common';

export class ExportableMapping extends fshtypes.Mapping implements Exportable {
  rules: (ExportableMappingRule | ExportableInsertRule)[];

  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    const metadataFSH = metadataToFSH(this);
    const rulesFSH = this.rules.map(r => r.toFSH()).join(EOL);
    return `${metadataFSH}${rulesFSH.length ? EOL + rulesFSH : ''}`;
  }
}
