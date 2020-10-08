import { fhirdefs } from 'fsh-sushi';
import { ExportableExtension, ExportableInvariant } from '../exportable';
import { AbstractSDProcessor } from './StructureDefinitionProcessor';
import { ProcessableElementDefinition } from '.';

// TODO: ProfileProcessor and ExtensionProcessor may not be sufficiently different to justify
// having different classes. For now they're separate but we may want to combine them.
export class ExtensionProcessor extends AbstractSDProcessor {
  static process(
    input: any,
    fhir: fhirdefs.FHIRDefinitions
  ): [ExportableExtension, ...ExportableInvariant[]] | [] {
    if (ExtensionProcessor.isProcessableStructureDefinition(input)) {
      const extension = new ExportableExtension(input.name);
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      ExtensionProcessor.extractKeywords(input, extension);
      const invariants = ExtensionProcessor.extractInvariants(elements);
      ExtensionProcessor.extractRules(input, elements, extension, fhir);
      return [extension, ...invariants];
    }
    return [];
  }
}
