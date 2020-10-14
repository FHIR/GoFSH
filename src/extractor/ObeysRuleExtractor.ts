import { ProcessableElementDefinition } from '../processor';
import { ExportableObeysRule } from '../exportable';
import { getPath } from '../utils';

export class ObeysRuleExtractor {
  static process(input: ProcessableElementDefinition): ExportableObeysRule {
    const invariantKeys: string[] = [];
    if (input.constraint?.length > 0) {
      input.constraint.forEach((constraint, i) => {
        // if the element's key was processed, that means an Invariant exists, and we should add an ObeysRule.
        if (input.processedPaths.includes(`constraint[${i}].key`)) {
          invariantKeys.push(constraint.key);
        }
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
