import { fshtypes } from 'fsh-sushi';
import { ProcessableElementDefinition } from '../processor';
import { ExportableObeysRule, ExportableInvariant } from '../exportable';
import { getPath } from '../utils';

export class ObeysRuleExtractor {
  static process(
    input: ProcessableElementDefinition
  ): { obeysRule: ExportableObeysRule; invariants: ExportableInvariant[] } {
    const invariants: ExportableInvariant[] = [];
    if (input.constraint?.length > 0) {
      input.constraint.forEach((constraint, i) => {
        // required: key, human, severity
        const invariant = new ExportableInvariant(constraint.key);
        invariant.description = constraint.human;
        invariant.severity = new fshtypes.FshCode(constraint.severity);
        input.processedPaths.push(
          `constraint[${i}].key`,
          `constraint[${i}].human`,
          `constraint[${i}].severity`
        );
        // optional: expression, xpath
        if (constraint.expression) {
          invariant.expression = constraint.expression;
          input.processedPaths.push(`constraint[${i}].expression`);
        }
        if (constraint.xpath) {
          invariant.xpath = constraint.xpath;
          input.processedPaths.push(`constraint[${i}].xpath`);
        }
        invariants.push(invariant);
      });
    }
    if (invariants.length) {
      const obeysRule = new ExportableObeysRule(getPath(input));
      obeysRule.keys = invariants.map(inv => inv.name);
      return { obeysRule, invariants };
    }
    return { obeysRule: null, invariants };
  }
}
