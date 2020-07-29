import fs from 'fs-extra';
import { ProfileProcessor } from './ProfileProcessor';
import { ExtensionProcessor } from './ExtensionProcessor';
import { StructureDefinition } from 'fsh-sushi/dist/fhirtypes';

export class FHIRProcessor {
  private profileProcessor: ProfileProcessor;
  private extensionProcessor: ExtensionProcessor;

  constructor() {
    this.profileProcessor = new ProfileProcessor();
    this.extensionProcessor = new ExtensionProcessor();
  }

  process(inputPath: string) {
    const rawContent = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

    if (rawContent['resourceType'] === 'StructureDefinition') {
      // Profiles and Extensions are both made from StructureDefinitions
      const sd = StructureDefinition.fromJSON(rawContent);
      if (sd.type === 'Extension') {
        return this.extensionProcessor.process(sd);
      } else {
        return this.profileProcessor.process(sd);
      }
    }
  }
}
