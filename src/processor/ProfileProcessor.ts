import { fhirdefs } from 'fsh-sushi';
import { AbstractSDProcessor } from './StructureDefinitionProcessor';
import { ExportableProfile } from '../exportable';

export class ProfileProcessor extends AbstractSDProcessor {
  static process(input: any, fhir: fhirdefs.FHIRDefinitions): ExportableProfile {
    if (ProfileProcessor.isProcessableStructureDefinition(input)) {
      const profile = new ExportableProfile(input.name);
      ProfileProcessor.extractKeywords(input, profile);
      ProfileProcessor.extractRules(input, profile, fhir);
      return profile;
    }
  }
}
