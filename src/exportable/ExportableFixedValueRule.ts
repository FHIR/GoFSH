import { fshrules, fshtypes, fhirtypes } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableFixedValueRule extends fshrules.FixedValueRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    let printableValue = '';
    if (typeof this.fixedValue === 'boolean' || typeof this.fixedValue === 'number') {
      printableValue = String(this.fixedValue);
    } else if (typeof this.fixedValue === 'string') {
      printableValue = `"${this.fixedValue}"`;
    } else if (
      this.fixedValue instanceof fshtypes.FshCode ||
      this.fixedValue instanceof fshtypes.FshQuantity ||
      this.fixedValue instanceof fshtypes.FshRatio ||
      this.fixedValue instanceof fshtypes.FshReference
    ) {
      printableValue = this.fixedValue.toString();
    } else if (this.fixedValue instanceof fhirtypes.InstanceDefinition) {
      printableValue = this.fixedValue.id;
    }

    return `* ${this.path} = ${printableValue}${this.exactly ? ' (exactly)' : ''}`;
  }
}
