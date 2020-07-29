import { ValueSetRule } from 'fsh-sushi/dist/fshtypes/rules';
import { ExportableRule } from '.';

export class ExportableValueSetRule extends ValueSetRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    return `* ${this.path} from ${this.valueSet} (${this.strength})`;
  }
}
