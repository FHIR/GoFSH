import { fshrules } from 'fsh-sushi';
import { fshifyString } from '../exportable/common';
import { ExportableRule } from '.';

export class ExportableMappingRule extends fshrules.MappingRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    const path = this.path ? ` ${this.path}` : '';
    const comment = this.comment ? ` "${fshifyString(this.comment)}"` : '';
    const language = this.language ? ` ${this.language.toString()}` : '';
    return `*${path} -> "${fshifyString(this.map)}"${comment}${language}`;
  }
}
