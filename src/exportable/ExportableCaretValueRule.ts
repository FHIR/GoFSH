import { fhirtypes, fshrules, fshtypes } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableCaretValueRule extends fshrules.CaretValueRule implements ExportableRule {
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
    return `* ${this.path !== '' ? this.path + ' ' : ''}^${this.caretPath} = ${value}`;
  }
}
