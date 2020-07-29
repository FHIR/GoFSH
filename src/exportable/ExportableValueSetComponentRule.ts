import { ValueSetComponentRule } from 'fsh-sushi/dist/fshtypes/rules';
import { ExportableRule } from '.';

export class ExportableValueSetComponentRule extends ValueSetComponentRule
  implements ExportableRule {
  constructor(inclusion: boolean) {
    super(inclusion);
  }

  toFSH(): string {
    return '// Unimplemented: value set component rule';
  }
}
