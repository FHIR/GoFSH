import { fhirdefs } from 'fsh-sushi';
import { ExportableExtension, ExportableInvariant } from '../exportable';
import { AbstractSDProcessor } from './StructureDefinitionProcessor';

// TODO: ProfileProcessor and ExtensionProcessor may not be sufficiently different to justify
// having different classes. For now they're separate but we may want to combine them.
export class ExtensionProcessor extends AbstractSDProcessor {
  static process(
    input: any,
    fhir: fhirdefs.FHIRDefinitions
  ): [ExportableExtension, ...ExportableInvariant[]] | [] {
    if (ExtensionProcessor.isProcessableStructureDefinition(input)) {
      const extension = new ExportableExtension(input.name);
      ExtensionProcessor.extractKeywords(input, extension);
      ExtensionProcessor.extractRules(input, extension, fhir);
      const invariants = ExtensionProcessor.extractInvariants(input);
      return [extension, ...invariants];
    }
    return [];
  }
}
