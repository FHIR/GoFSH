import { fhirdefs } from 'fsh-sushi';
import { AbstractSDProcessor } from './StructureDefinitionProcessor';
import { ExportableProfile, ExportableInvariant } from '../exportable';
import { ProcessableElementDefinition } from '.';

export class ProfileProcessor extends AbstractSDProcessor {
  static process(
    input: any,
    fhir: fhirdefs.FHIRDefinitions
  ): [ExportableProfile, ...ExportableInvariant[]] | [] {
    if (ProfileProcessor.isProcessableStructureDefinition(input)) {
      const profile = new ExportableProfile(input.name);
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      ProfileProcessor.extractKeywords(input, profile);
      const invariants = ProfileProcessor.extractInvariants(elements);
      ProfileProcessor.extractRules(input, elements, profile, fhir);
      return [profile, ...invariants];
    }
    return [];
  }
}
