import { fshtypes } from 'fsh-sushi';
import { isEqual } from 'lodash';
import { ExportableInvariant } from '../exportable/ExportableInvariant';
import { ProcessableElementDefinition } from '../processor';

export class InvariantExtractor {
  static process(
    input: ProcessableElementDefinition,
    existingInvariants: ExportableInvariant[]
  ): ExportableInvariant[] {
    const invariants: ExportableInvariant[] = [];
    if (input.constraint?.length > 0) {
      input.constraint.forEach((constraint, i) => {
        const constraintPaths: string[] = [];
        // required: key, human, severity
        const invariant = new ExportableInvariant(constraint.key);
        invariant.description = constraint.human;
        invariant.severity = new fshtypes.FshCode(constraint.severity);
        constraintPaths.push(
          `constraint[${i}].key`,
          `constraint[${i}].human`,
          `constraint[${i}].severity`
        );
        // optional: expression, xpath
        if (constraint.expression) {
          invariant.expression = constraint.expression;
          constraintPaths.push(`constraint[${i}].expression`);
        }
        if (constraint.xpath) {
          invariant.xpath = constraint.xpath;
          constraintPaths.push(`constraint[${i}].xpath`);
        }

        // if an invariant with this key already exists, don't make a new invariant with the same key.
        // if the new invariant would be an exact match of the existing invariant, mark the paths as
        // processed so an ObeysRule is created and no CaretValueRules are created.
        // if the new invariant has a key match but isn't an exact match, it will be created using CaretValueRules.
        const matchingKeyInvariant = [...existingInvariants, ...invariants].find(
          inv => inv.name === constraint.key
        );
        if (matchingKeyInvariant) {
          if (isEqual(matchingKeyInvariant, invariant)) {
            input.processedPaths.push(...constraintPaths);
          }
        } else {
          input.processedPaths.push(...constraintPaths);
          invariants.push(invariant);
        }
      });
    }
    return invariants;
  }
}
