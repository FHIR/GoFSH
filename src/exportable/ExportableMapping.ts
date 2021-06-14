import { EOL } from 'os';
import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableMappingRule, ExportableInsertRule } from '.';

export class ExportableMapping extends fshtypes.Mapping implements Exportable {
  fshComment: string;
  rules: (ExportableMappingRule | ExportableInsertRule)[];

  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    let fshComments = '';
    if (this.fshComment) {
      fshComments =
        this.fshComment
          .split('\n')
          .map(c => `// ${c}`)
          .join(EOL) + EOL;
    }
    return `${fshComments}${super.toFSH()}`;
  }
}
