import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableValueSetComponentRule extends fshrules.ValueSetComponentRule
  implements ExportableRule {
  constructor(inclusion: boolean) {
    super(inclusion);
  }

  toFSH(): string {
    return '// Unimplemented: value set component rule';
  }
}
