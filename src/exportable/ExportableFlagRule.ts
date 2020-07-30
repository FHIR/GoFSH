import { FlagRule } from 'fsh-sushi/dist/fshtypes/rules';
import { ExportableRule } from '.';

export class ExportableFlagRule extends FlagRule implements ExportableRule {
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

  toFSH(): string {
    return `* ${this.path} ${this.flags.join(' ')}`;
  }
}
