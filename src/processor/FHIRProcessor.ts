import fs from 'fs-extra';
import { fhirdefs } from 'fsh-sushi';
import { logger } from '../utils';
import {
  StructureDefinitionProcessor,
  CodeSystemProcessor,
  ValueSetProcessor,
  ConfigurationProcessor
} from '.';
import { ExportableConfiguration } from '../exportable';
import { ConfigurationExtractor } from '../extractor';
import { Package } from './Package';

export class FHIRProcessor {
  public readonly structureDefinitions: Map<string, any> = new Map();
  public readonly codeSystems: Map<string, any> = new Map();
  public readonly valueSets: Map<string, any> = new Map();
  public readonly implementationGuides: Map<string, any> = new Map();
  public readonly fhir: fhirdefs.FHIRDefinitions;

  constructor(fhir: fhirdefs.FHIRDefinitions) {
    this.fhir = fhir;
  }

  register(inputPath: string): void {
    const rawContent = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

    if (rawContent['resourceType'] === 'StructureDefinition') {
      // Profiles and Extensions are both made from StructureDefinitions
      // Invariants may be contained within StructureDefinitions
      this.structureDefinitions.set(inputPath, rawContent);
      logger.debug(`Registered contents of ${inputPath} as StructureDefinition.`);
    } else if (rawContent['resourceType'] === 'CodeSystem') {
      this.codeSystems.set(inputPath, rawContent);
      logger.debug(`Registered contents of ${inputPath} as CodeSystem.`);
    } else if (rawContent['resourceType'] === 'ValueSet') {
      this.valueSets.set(inputPath, rawContent);
      logger.debug(`Registered contents of ${inputPath} as ValueSet.`);
    } else if (rawContent['resourceType'] === 'ImplementationGuide') {
      this.implementationGuides.set(inputPath, rawContent);
    } else {
      logger.warn(`Skipping unsupported resource: ${inputPath}`);
    }
  }

  process(): Package {
    const resources = new Package();
    let config: ExportableConfiguration;
    if (this.implementationGuides.size > 0) {
      config = ConfigurationProcessor.process(Array.from(this.implementationGuides.values())[0]);
    } else {
      config = ConfigurationExtractor.process([
        ...Array.from(this.structureDefinitions.values()),
        ...Array.from(this.codeSystems.values())
      ]);
    }
    resources.add(config);
    this.structureDefinitions.forEach((sd, inputPath) => {
      try {
        StructureDefinitionProcessor.process(sd, this.fhir, resources.invariants).forEach(
          resource => {
            resources.add(resource);
          }
        );
      } catch (ex) {
        logger.error(`Could not process StructureDefinition at ${inputPath}: ${ex.message}`);
      }
    });
    this.codeSystems.forEach((cs, inputPath) => {
      try {
        resources.add(CodeSystemProcessor.process(cs, this.fhir));
      } catch (ex) {
        logger.error(`Could not process CodeSystem at ${inputPath}: ${ex.message}`);
      }
    });
    this.valueSets.forEach((vs, inputPath) => {
      try {
        resources.add(ValueSetProcessor.process(vs, this.fhir));
      } catch (ex) {
        logger.error(`Could not process ValueSet at ${inputPath}: ${ex.message}`);
      }
    });
    return resources;
  }
}
