import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableMappingRule extends fshrules.MappingRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }
}
