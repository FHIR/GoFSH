import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableMappingRule extends fshrules.MappingRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    const path = this.path ? `${this.path} ` : '';
    const comment = this.comment ? ` "${this.comment}"` : '';
    const language = this.language ? ` ${this.language.toString()}` : '';
    return `* ${path}-> "${this.map}"${comment}${language}`;
  }
}
