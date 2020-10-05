import fs from 'fs-extra';
import { fhirdefs } from 'fsh-sushi';
import { logger } from '../utils';
import { ProfileProcessor } from './ProfileProcessor';
import { ExtensionProcessor } from './ExtensionProcessor';
import { CodeSystemProcessor } from './CodeSystemProcessor';
import { InvariantProcessor } from './InvariantProcessor';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableCodeSystem,
  ExportableInvariant
} from '../exportable';

export class FHIRProcessor {
  public readonly structureDefinitions: any[] = [];
  public readonly fhir: fhirdefs.FHIRDefinitions;

  constructor(fhir: fhirdefs.FHIRDefinitions) {
    this.fhir = fhir;
  }

  process(
    inputPath: string
  ): (ExportableProfile | ExportableExtension | ExportableCodeSystem | ExportableInvariant)[] {
    const rawContent = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

    if (rawContent['resourceType'] === 'StructureDefinition') {
      // Profiles and Extensions are both made from StructureDefinitions
      // Invariants may be contained within StructureDefinitions
      this.structureDefinitions.push(rawContent);
      if (rawContent.type === 'Extension') {
        logger.debug(`Processing contents of ${inputPath} as Extension.`);
        const extension = ExtensionProcessor.process(rawContent, this.fhir);
        if (extension) {
          return [extension, ...InvariantProcessor.process(rawContent)];
        }
      } else {
        logger.debug(`Processing contents of ${inputPath} as Profile.`);
        const profile = ProfileProcessor.process(rawContent, this.fhir);
        if (profile) {
          return [profile, ...InvariantProcessor.process(rawContent)];
        }
      }
    } else if (rawContent['resourceType'] === 'CodeSystem') {
      logger.debug(`Processing contents of ${inputPath} as CodeSystem.`);
      return [CodeSystemProcessor.process(rawContent)];
    }
  }
}
