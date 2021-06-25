import { fshrules } from 'fsh-sushi';
import { ExportableRule, INDENT_SIZE } from '.';
import { repeat } from 'lodash';

export class ExportableFlagRule extends fshrules.FlagRule implements ExportableRule {
  indent: number;

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
    return `${repeat(' ', INDENT_SIZE * (this.indent ?? 0))}${super.toFSH()}`;
  }
}
