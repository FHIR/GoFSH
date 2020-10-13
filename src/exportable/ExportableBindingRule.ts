import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableBindingRule extends fshrules.BindingRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return `* ${this.path} from ${this.valueSet} (${this.strength})`;
  }
}
