import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export type ExportableValueSetComponentRule =
  | ExportableValueSetConceptComponentRule
  | ExportableValueSetFilterComponentRule;

export class ExportableValueSetConceptComponentRule extends fshrules.ValueSetConceptComponentRule
  implements ExportableRule {
  indent: number;

  constructor(inclusion: boolean) {
    super(inclusion);
  }
}

export class ExportableValueSetFilterComponentRule extends fshrules.ValueSetFilterComponentRule
  implements ExportableRule {
  indent: number;

  constructor(inclusion: boolean) {
    super(inclusion);
  }
}
