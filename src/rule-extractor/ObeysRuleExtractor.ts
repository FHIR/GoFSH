import { ProcessableElementDefinition } from '../processor';
import { ExportableObeysRule } from '../exportable';
import { getPath } from '../utils';

export class ObeysRuleExtractor {
  static process(input: ProcessableElementDefinition): ExportableObeysRule {
    const invariantKeys: string[] = [];
    if (input.constraint?.length > 0) {
      input.constraint.forEach((constraint, i) => {
        invariantKeys.push(constraint.key);
        // The ObeysRule only contains the key, but these other attributes
        // will be handled by the InvariantProcessor. So, they should not be
        // used for CaretValueRules.
        input.processedPaths.push(
          `constraint[${i}].key`,
          `constraint[${i}].human`,
          `constraint[${i}].severity`,
          `constraint[${i}].expression`,
          `constraint[${i}].xpath`
        );
      });
    }
    if (invariantKeys.length) {
      const obeysRule = new ExportableObeysRule(getPath(input));
      obeysRule.keys = invariantKeys;
      return obeysRule;
    }
    return null;
  }
}
