import { fshtypes } from 'fsh-sushi';
import { ExportableInvariant } from '../exportable/ExportableInvariant';
import { ProcessableElementDefinition } from '../processor';

export class InvariantExtractor {
  static process(input: ProcessableElementDefinition): ExportableInvariant[] {
    const invariants: ExportableInvariant[] = [];
    if (input.constraint?.length > 0) {
      input.constraint.forEach(constraint => {
        // required: key, human, severity
        const invariant = new ExportableInvariant(constraint.key);
        invariant.description = constraint.human;
        invariant.severity = new fshtypes.FshCode(constraint.severity);
        // optional: expression, xpath
        if (constraint.expression) {
          invariant.expression = constraint.expression;
        }
        if (constraint.xpath) {
          invariant.xpath = constraint.xpath;
        }
        invariants.push(invariant);
      });
    }
    return invariants;
  }
}
