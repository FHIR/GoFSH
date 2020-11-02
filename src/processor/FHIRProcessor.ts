import fs from 'fs-extra';
import { fhirdefs, utils } from 'fsh-sushi';
import { logger, MasterFisher } from '../utils';
import {
  StructureDefinitionProcessor,
  CodeSystemProcessor,
  ValueSetProcessor,
  ConfigurationProcessor
} from '.';
import { ExportableConfiguration } from '../exportable';
import { ConfigurationExtractor } from '../extractor';
import { Package } from './Package';

export class FHIRProcessor implements utils.Fishable {
  public readonly structureDefinitions: Map<string, any> = new Map();
  public readonly codeSystems: Map<string, any> = new Map();
  public readonly valueSets: Map<string, any> = new Map();
  public readonly implementationGuides: Map<string, any> = new Map();
  private readonly fhir: fhirdefs.FHIRDefinitions;
  private readonly local: fhirdefs.FHIRDefinitions;
  private readonly fisher: MasterFisher;

  constructor(fhir: fhirdefs.FHIRDefinitions) {
    this.fhir = fhir;
    this.local = new fhirdefs.FHIRDefinitions();
    this.fisher = new MasterFisher(this.local, this.fhir);
  }

  register(inputPath: string): void {
    const rawContent = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

    // First do a very baseline check to ensure this is a FHIR Resource
    if (typeof rawContent !== 'object' || rawContent.resourceType == null) {
      logger.debug(`Skipping non-FHIR JSON file: ${inputPath}`);
      return;
    } else if (/^http:\/\/hl7.org\/fhir\/comparison\//.test(rawContent.url)) {
      // The IG Publisher creates weird "Intersection" and "Union" SD files, so this check filters them out
      logger.debug(`Skipping temporary "comparison" file created by IG Publisher: ${inputPath}`);
      return;
    }

    // add it to the local FHIRDefinitions to support fisher functions
    this.local.add(rawContent);

    // add it to appropriate map by its type
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
        StructureDefinitionProcessor.process(sd, this.fisher, resources.invariants).forEach(
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
        resources.add(CodeSystemProcessor.process(cs));
      } catch (ex) {
        logger.error(`Could not process CodeSystem at ${inputPath}: ${ex.message}`);
      }
    });
    this.valueSets.forEach((vs, inputPath) => {
      try {
        resources.add(ValueSetProcessor.process(vs));
      } catch (ex) {
        logger.error(`Could not process ValueSet at ${inputPath}: ${ex.message}`);
      }
    });
    return resources;
  }

  fishForFHIR(item: string, ...types: utils.Type[]) {
    // fall back to implementation in local (FHIRDefinitions)
    // NOTE: This will need to be updated if we need to support fishing for Instances
    return this.local.fishForFHIR(item, ...types);
  }

  fishForMetadata(item: string, ...types: utils.Type[]): utils.Metadata {
    // fall back to implementation in local (FHIRDefinitions)
    // NOTE: This will need to be updated if we need to support fishing for Instances
    return this.local.fishForMetadata(item, ...types);
  }
}
