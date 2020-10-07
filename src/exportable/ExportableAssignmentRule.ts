import { fshrules, fshtypes, fhirtypes } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableAssignmentRule extends fshrules.AssignmentRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    let printableValue = '';
    if (typeof this.value === 'boolean' || typeof this.value === 'number') {
      printableValue = String(this.value);
    } else if (typeof this.value === 'string') {
      printableValue = `"${this.value}"`;
    } else if (
      this.value instanceof fshtypes.FshCode ||
      this.value instanceof fshtypes.FshQuantity ||
      this.value instanceof fshtypes.FshRatio ||
      this.value instanceof fshtypes.FshReference
    ) {
      printableValue = this.value.toString();
    } else if (this.value instanceof fhirtypes.InstanceDefinition) {
      printableValue = this.value.id;
    }

    return `* ${this.path} = ${printableValue}${this.exactly ? ' (exactly)' : ''}`;
  }
}
