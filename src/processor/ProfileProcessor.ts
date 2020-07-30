import { StructureDefinition } from 'fsh-sushi/dist/fhirtypes';
import { AbstractSDProcessor } from './StructureDefinitionProcessor';
import { ExportableProfile } from '../exportable';

export class ProfileProcessor extends AbstractSDProcessor {
  process(input: StructureDefinition): ExportableProfile {
    const profile = new ExportableProfile(input.name);
    super.extractKeywords(input, profile);
    return profile;
  }
}
