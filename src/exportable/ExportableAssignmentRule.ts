import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableAssignmentRule extends fshrules.AssignmentRule implements ExportableRule {
  indent: number;

  constructor(path: string) {
    super(path);
  }
}
