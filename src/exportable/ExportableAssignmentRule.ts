import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableAssignmentRule extends fshrules.AssignmentRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }
}
