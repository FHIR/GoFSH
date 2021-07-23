import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export type ExportableValueSetComponentRule =
  | ExportableValueSetConceptComponentRule
  | ExportableValueSetFilterComponentRule;

export class ExportableValueSetConceptComponentRule extends fshrules.ValueSetConceptComponentRule
  implements ExportableRule {
  // indent is required to implement ExportableRule, but is not actually used
  indent: number;

  constructor(inclusion: boolean) {
    super(inclusion);
  }
}

export class ExportableValueSetFilterComponentRule extends fshrules.ValueSetFilterComponentRule
  implements ExportableRule {
  // indent is required to implement ExportableRule, but is not actually used
  indent: number;

  constructor(inclusion: boolean) {
    super(inclusion);
  }
}
