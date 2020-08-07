import { isUri } from 'valid-url';
import { fhirtypes, fshrules, fshtypes } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableCaretValueRule extends fshrules.CaretValueRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    let fixedValue;
    if (
      this.value instanceof fshtypes.FshCanonical ||
      this.value instanceof fshtypes.FshCode ||
      this.value instanceof fshtypes.FshQuantity ||
      this.value instanceof fshtypes.FshRatio ||
      this.value instanceof fshtypes.FshReference
    ) {
      fixedValue = this.value.toString();
    } else if (this.value instanceof fhirtypes.InstanceDefinition) {
      fixedValue = this.value._instanceMeta.name;
    } else if (typeof this.value === 'boolean' || typeof this.value === 'number') {
      fixedValue = this.value;
    } else if (typeof this.value === 'string') {
      if (isUri(this.value)) {
        fixedValue = this.value;
      } else {
        fixedValue = `"${this.value}"`;
      }
    }
    return `* ${this.path !== '' ? this.path + ' ' : ''}^${this.caretPath} = ${fixedValue}`;
  }
}
