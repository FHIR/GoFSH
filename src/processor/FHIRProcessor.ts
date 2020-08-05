import fs from 'fs-extra';
import { StructureDefinition } from 'fsh-sushi/dist/fhirtypes';
import { ProfileProcessor } from './ProfileProcessor';
import { ExtensionProcessor } from './ExtensionProcessor';
import { logger } from '../utils';

export class FHIRProcessor {
  private profileProcessor: ProfileProcessor;
  private extensionProcessor: ExtensionProcessor;
  public readonly structureDefinitions: StructureDefinition[] = [];

  constructor() {
    this.profileProcessor = new ProfileProcessor();
    this.extensionProcessor = new ExtensionProcessor();
  }

  process(inputPath: string) {
    const rawContent = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

    if (rawContent['resourceType'] === 'StructureDefinition') {
      // Profiles and Extensions are both made from StructureDefinitions
      const sd = StructureDefinition.fromJSON(rawContent);
      this.structureDefinitions.push(sd);
      if (sd.type === 'Extension') {
        logger.debug(`Processing contents of ${inputPath} as Extension.`);
        return this.extensionProcessor.process(sd);
      } else {
        logger.debug(`Processing contents of ${inputPath} as Profile.`);
        return this.profileProcessor.process(sd);
      }
    }
  }
}
