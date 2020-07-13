import { StructureDefinition } from 'fsh-sushi/dist/fhirtypes';
import { Profile } from 'fsh-sushi/dist/fshtypes';

export class ProfileProcessor {
  process(input: StructureDefinition): Profile {
    const profile = new Profile(input.name);
    if (input.id) {
      profile.id = input.id;
    }
    if (input.title) {
      profile.title = input.title;
    }
    if (input.description) {
      profile.description = input.description;
    }
    return profile;
  }
}
