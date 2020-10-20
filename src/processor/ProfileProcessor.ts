import { fhirdefs } from 'fsh-sushi';
import { AbstractSDProcessor } from './StructureDefinitionProcessor';
import { ExportableProfile, ExportableInvariant, ExportableMapping } from '../exportable';
import { ProcessableElementDefinition } from '.';

export class ProfileProcessor extends AbstractSDProcessor {
  static process(
    input: any,
    fhir: fhirdefs.FHIRDefinitions,
    existingInvariants: ExportableInvariant[] = []
  ): [ExportableProfile, ...(ExportableInvariant | ExportableMapping)[]] | [] {
    if (ProfileProcessor.isProcessableStructureDefinition(input)) {
      const profile = new ExportableProfile(input.name);
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      ProfileProcessor.extractKeywords(input, profile);
      const invariants = ProfileProcessor.extractInvariants(elements, existingInvariants);
      const mappings = ProfileProcessor.extractMappings(elements, input, fhir);
      ProfileProcessor.extractRules(input, elements, profile, fhir);
      return [profile, ...[...invariants, ...mappings]];
    }
    return [];
  }
}
