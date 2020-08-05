import { AbstractSDProcessor } from './StructureDefinitionProcessor';
import { ExportableProfile } from '../exportable';

export class ProfileProcessor extends AbstractSDProcessor {
  static process(input: any): ExportableProfile {
    if (ProfileProcessor.isProcessableStructureDefinition(input)) {
      const profile = new ExportableProfile(input.name);
      ProfileProcessor.extractKeywords(input, profile);
      ProfileProcessor.extractRules(input, profile);
      return profile;
    }
  }
}
