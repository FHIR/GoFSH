import { ExportableRule, ExportableCardRule, INDENT_SIZE } from '.';
import { fshrules } from 'fsh-sushi';
import { ExportableFlagRule } from './ExportableFlagRule';
import { repeat } from 'lodash';

// NOTE: This needs to extend a SUSHI SdRule (in this case fshrules.FlagRule) because
// ExportableProfile.rules (which allows ExportableCombinedCardFlagRule) must be assignable to
// Profile.rules in order for TypeScript to recognize it as a proper subclass of Profile.
export class ExportableCombinedCardFlagRule extends fshrules.FlagRule implements ExportableRule {
  indent = 0;

  constructor(
    path: string,
    public cardRule: ExportableCardRule,
    // GoFSH only creates 1 flag rule per path (even though human authors can create > 1)
    public flagRule: ExportableFlagRule
  ) {
    super(path);
  }

  // Redirect all min/max accessors to cardRule.min/cardRule.max

  get min(): number {
    return this.cardRule.min;
  }

  set min(n: number) {
    this.cardRule.min = n;
  }

  get max(): string {
    return this.cardRule.max;
  }

  set max(n: string) {
    this.cardRule.max = n;
  }

  toFSH(): string {
    return `${repeat(' ', INDENT_SIZE * this.indent)}* ${
      this.path
    } ${this.cardRule.cardToString()} ${this.flagRule.flagsToString()}`;
  }
}
