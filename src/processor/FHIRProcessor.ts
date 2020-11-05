import { utils } from 'fsh-sushi';
import { logger } from '../utils';
import {
  StructureDefinitionProcessor,
  CodeSystemProcessor,
  ValueSetProcessor,
  ConfigurationProcessor,
  Package,
  LakeOfFHIR
} from '.';
import { ExportableConfiguration } from '../exportable';
import { ConfigurationExtractor } from '../extractor';

export class FHIRProcessor {
  constructor(private readonly lake: LakeOfFHIR, private readonly fisher?: utils.Fishable) {
    // If no fisher was passed in, just use the built-in lake fisher (usually for testing only)
    if (fisher == null) {
      fisher = lake;
    }
  }

  process(): Package {
    const resources = new Package();
    let config: ExportableConfiguration;
    if (this.lake.getAllImplementationGuides().length > 0) {
      config = ConfigurationProcessor.process(this.lake.getAllImplementationGuides()[0].content);
    } else {
      config = ConfigurationExtractor.process(
        [
          ...this.lake.getAllStructureDefinitions(),
          ...this.lake.getAllCodeSystems(),
          ...this.lake.getAllValueSets()
        ].map(wild => wild.content)
      );
    }
    resources.add(config);
    this.lake.getAllStructureDefinitions().forEach(wild => {
      try {
        StructureDefinitionProcessor.process(
          wild.content,
          this.fisher,
          resources.invariants
        ).forEach(resource => {
          resources.add(resource);
        });
      } catch (ex) {
        logger.error(`Could not process StructureDefinition at ${wild.path}: ${ex.message}`);
      }
    });
    this.lake.getAllCodeSystems().forEach(wild => {
      try {
        resources.add(CodeSystemProcessor.process(wild.content, this.fisher));
      } catch (ex) {
        logger.error(`Could not process CodeSystem at ${wild.path}: ${ex.message}`);
      }
    });
    this.lake.getAllValueSets().forEach(wild => {
      try {
        resources.add(ValueSetProcessor.process(wild.content, this.fisher));
      } catch (ex) {
        logger.error(`Could not process ValueSet at ${wild.path}: ${ex.message}`);
      }
    });
    this.lake.getAllUnsupportedResources().forEach(wild => {
      logger.warn(`Skipping unsupported resource: ${wild.path}`);
    });
    return resources;
  }
}
