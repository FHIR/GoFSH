import fs from 'fs-extra';
import { fhirdefs } from 'fsh-sushi';
import { logger } from '../utils';
import { StructureDefinitionProcessor, CodeSystemProcessor, ConfigurationProcessor } from '.';
import { ExportableConfiguration } from '../exportable';
import { ConfigurationExtractor } from '../extractor';
import { Package } from './Package';

export class FHIRProcessor {
  public readonly structureDefinitions: any[] = [];
  public readonly codeSystems: any[] = [];
  public readonly implementationGuides: any[] = [];
  public readonly fhir: fhirdefs.FHIRDefinitions;

  constructor(fhir: fhirdefs.FHIRDefinitions) {
    this.fhir = fhir;
  }

  register(inputPath: string): void {
    const rawContent = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

    if (rawContent['resourceType'] === 'StructureDefinition') {
      // Profiles and Extensions are both made from StructureDefinitions
      // Invariants may be contained within StructureDefinitions
      this.structureDefinitions.push(rawContent);
      logger.debug(`Registered contents of ${inputPath} as StructureDefinition.`);
    } else if (rawContent['resourceType'] === 'CodeSystem') {
      this.codeSystems.push(rawContent);
      logger.debug(`Registered contents of ${inputPath} as CodeSystem.`);
    } else if (rawContent['resourceType'] === 'ImplementationGuide') {
      this.implementationGuides.push(rawContent);
    }
  }

  process(resources: Package) {
    let config: ExportableConfiguration;
    if (this.implementationGuides.length > 0) {
      config = ConfigurationProcessor.process(this.implementationGuides[0]);
    } else {
      config = ConfigurationExtractor.process([...this.structureDefinitions, ...this.codeSystems]);
    }
    resources.add(config);
    this.structureDefinitions.forEach(sd => {
      try {
        StructureDefinitionProcessor.process(sd, this.fhir, resources.invariants).forEach(
          resource => {
            resources.add(resource);
          }
        );
      } catch (ex) {
        logger.error(`Could not process StructureDefinition: ${ex.message}`);
      }
    });
    this.codeSystems.forEach(cs => {
      try {
        resources.add(CodeSystemProcessor.process(cs));
      } catch (ex) {
        logger.error(`Could not process StructureDefinition: ${ex.message}`);
      }
    });
  }
}
