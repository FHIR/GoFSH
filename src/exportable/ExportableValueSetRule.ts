import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableValueSetRule extends fshrules.ValueSetRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return `* ${this.path} from ${this.valueSet} (${this.strength})`;
  }
}
