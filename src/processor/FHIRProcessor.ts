import fs from 'fs-extra';
import { fhirdefs } from 'fsh-sushi';
import { logger } from '../utils';
import { StructureDefinitionProcessor, CodeSystemProcessor, ConfigurationProcessor } from '.';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableCodeSystem,
  ExportableConfiguration,
  ExportableInvariant,
  ExportableMapping
} from '../exportable';

export class FHIRProcessor {
  public readonly structureDefinitions: any[] = [];
  public readonly fhir: fhirdefs.FHIRDefinitions;

  constructor(fhir: fhirdefs.FHIRDefinitions) {
    this.fhir = fhir;
  }

  process(
    inputPath: string,
    existingInvariants: ExportableInvariant[] = []
  ): (
    | ExportableProfile
    | ExportableExtension
    | ExportableCodeSystem
    | ExportableConfiguration
    | ExportableInvariant
    | ExportableMapping
  )[] {
    const rawContent = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

    if (rawContent['resourceType'] === 'StructureDefinition') {
      // Profiles and Extensions are both made from StructureDefinitions
      // Invariants may be contained within StructureDefinitions
      this.structureDefinitions.push(rawContent);
      logger.debug(`Processing contents of ${inputPath} as StructureDefinition.`);
      return StructureDefinitionProcessor.process(rawContent, this.fhir, existingInvariants);
    } else if (rawContent['resourceType'] === 'CodeSystem') {
      logger.debug(`Processing contents of ${inputPath} as CodeSystem.`);
      return [CodeSystemProcessor.process(rawContent)];
    } else if (rawContent['resourceType'] === 'ImplementationGuide') {
      return [ConfigurationProcessor.process(rawContent)];
    } else {
      return [];
    }
  }
}
