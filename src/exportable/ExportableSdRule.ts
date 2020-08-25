import {
  ExportableCardRule,
  ExportableCaretValueRule,
  ExportableCombinedCardFlagRule,
  ExportableContainsRule,
  ExportableFixedValueRule,
  ExportableFlagRule,
  ExportableObeysRule,
  ExportableOnlyRule,
  ExportableValueSetRule,
  ExportableInsertRule
} from '.';

export type ExportableSdRule =
  | ExportableCardRule
  | ExportableCaretValueRule
  | ExportableCombinedCardFlagRule
  | ExportableContainsRule
  | ExportableFixedValueRule
  | ExportableFlagRule
  | ExportableObeysRule
  | ExportableOnlyRule
  | ExportableValueSetRule
  | ExportableInsertRule;
