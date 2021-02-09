import { fhirtypes, fshrules, fshtypes } from 'fsh-sushi';
import { EOL } from 'os';
import { ExportableRule } from '.';

export class ExportableCaretValueRule extends fshrules.CaretValueRule implements ExportableRule {
  comment: string;
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    let value;
    if (
      this.value instanceof fshtypes.FshCanonical ||
      this.value instanceof fshtypes.FshCode ||
      this.value instanceof fshtypes.FshQuantity ||
      this.value instanceof fshtypes.FshRatio ||
      this.value instanceof fshtypes.FshReference
    ) {
      value = this.value.toString();
    } else if (this.value instanceof fhirtypes.InstanceDefinition) {
      value = this.value._instanceMeta.name;
    } else if (typeof this.value === 'boolean' || typeof this.value === 'number') {
      value = this.value;
    } else if (typeof this.value === 'string') {
      value = this.isInstance ? this.value : `"${this.value}"`;
    }
    const lines: string[] = [];
    if (this.comment) {
      lines.push(...this.comment.split('\n').map(c => `// ${c}`));
    }
    lines.push(`* ${this.path !== '' ? this.path + ' ' : ''}^${this.caretPath} = ${value}`);
    return lines.join(EOL);
  }
}
