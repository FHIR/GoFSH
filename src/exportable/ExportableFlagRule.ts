import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableFlagRule extends fshrules.FlagRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  get flags(): string[] {
    const flags: string[] = [];
    if (this.mustSupport) flags.push('MS');
    if (this.modifier) flags.push('?!');
    if (this.summary) flags.push('SU');
    if (this.draft) flags.push('D');
    else if (this.trialUse) flags.push('TU');
    else if (this.normative) flags.push('N');

    return flags;
  }

  flagsToString(): string {
    return this.flags.join(' ');
  }

  toFSH(): string {
    return `* ${this.path} ${this.flagsToString()}`;
  }
}
