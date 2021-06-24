import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableMappingRule extends fshrules.MappingRule implements ExportableRule {
  indent: number;

  constructor(path: string) {
    super(path);
  }
}
