import fs from 'fs-extra';
import { ProfileProcessor } from './ProfileProcessor';
import { ExtensionProcessor } from './ExtensionProcessor';
import { CodeSystemProcessor } from './CodeSystemProcessor';

export class FHIRProcessor {
  public readonly structureDefinitions: any[] = [];
  process(inputPath: string) {
    const rawContent = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

    if (rawContent['resourceType'] === 'StructureDefinition') {
      // Profiles and Extensions are both made from StructureDefinitions
      this.structureDefinitions.push(rawContent);
      if (rawContent.type === 'Extension') {
        return ExtensionProcessor.process(rawContent);
      } else {
        return ProfileProcessor.process(rawContent);
      }
    } else if (rawContent['resourceType'] === 'CodeSystem') {
      return CodeSystemProcessor.process(rawContent);
    }
  }
}
