import { StructureDefinition } from 'fsh-sushi/dist/fhirtypes';
import { Profile } from 'fsh-sushi/dist/fshtypes';
import { AbstractSDProcessor } from './StructureDefinitionProcessor';

export class ProfileProcessor extends AbstractSDProcessor {
  process(input: StructureDefinition): Profile {
    const profile = new Profile(input.name);
    super.extractKeywords(input, profile);
    return profile;
  }
}
