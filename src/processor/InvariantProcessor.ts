import { fshtypes } from 'fsh-sushi';
import { ProcessableElementDefinition } from './ProcessableElementDefinition';
import { ExportableInvariant } from '../exportable';
import { ProcessableStructureDefinition } from './StructureDefinitionProcessor';

export class InvariantProcessor {
  static process(input: ProcessableStructureDefinition): ExportableInvariant[] {
    const invariants: ExportableInvariant[] = [];
    input.differential?.element?.forEach((element: ProcessableElementDefinition) => {
      if (element.constraint?.length > 0) {
        element.constraint.forEach(constraint => {
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
    });
    return invariants;
  }
}
