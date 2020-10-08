import { ProcessableElementDefinition } from '../processor';
import { ExportableObeysRule } from '../exportable';
import { getPath } from '../utils';

export class ObeysRuleExtractor {
  static process(input: ProcessableElementDefinition): ExportableObeysRule {
    const invariantKeys: string[] = [];
    if (input.constraint?.length > 0) {
      input.constraint.forEach((constraint, i) => {
        invariantKeys.push(constraint.key);
        input.processedPaths.push(`constraint[${i}].key`);
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
