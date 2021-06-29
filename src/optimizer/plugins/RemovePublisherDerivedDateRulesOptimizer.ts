import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableCaretValueRule, ExportableRule } from '../../exportable';
import { isEqual } from 'lodash';

export default {
  name: 'remove_publisher_derived_date_rules',
  description:
    'Remove ^date rules that appear to be the result of the IG Publisher automatically setting a date',

  optimize(pkg: Package): void {
    let allDatesMatch = true;
    let date: string;
    for (const resource of [
      ...pkg.profiles,
      ...pkg.extensions,
      ...pkg.logicals,
      ...pkg.resources,
      ...pkg.valueSets,
      ...pkg.codeSystems
    ]) {
      for (const rule of resource.rules) {
        if (
          rule instanceof ExportableCaretValueRule &&
          rule.caretPath === 'date' &&
          rule.path === ''
        ) {
          const dateValue = rule.value as string; // If the rule assigns a date, the value will be a string.
          if (!date) date = dateValue; // Set the date to match
          if (date !== dateValue) {
            allDatesMatch = false;
            return; // If any date hasn't matched the others, we don't want to remove any rules.
          }
        }
      }
    }

    // If there are no date CaretValueRules found, just return.
    if (date == null) {
      return;
    }

    // If all dates are the same, are defined to the second, and are in GMT,
    // we can assume they were set by the IG Publisher and can be safely removed.
    // Make sure the value matches one allowed by the dateTime type in FHIR.
    // See: http://hl7.org/fhir/R4/datatypes.html#dateTime
    const dateTimeRegex = /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1])(T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00)))?)?)?$/;
    const dateTimeMatch = date.match(dateTimeRegex);
    const usesGMT = dateTimeMatch && date.endsWith('+00:00'); // If it is a valid FHIR dateTime, check that it uses GMT time zone
    if (allDatesMatch && usesGMT) {
      const DEFAULT_DATE = new ExportableCaretValueRule('');
      DEFAULT_DATE.caretPath = 'date';
      DEFAULT_DATE.value = date;
      [
        ...pkg.profiles,
        ...pkg.extensions,
        ...pkg.logicals,
        ...pkg.resources,
        ...pkg.valueSets,
        ...pkg.codeSystems
      ].forEach(resource => {
        (resource.rules as ExportableRule[]) = (resource.rules as ExportableRule[]).filter(
          rule => !isEqual(rule, DEFAULT_DATE)
        );
      });
    }
  }
} as OptimizerPlugin;
