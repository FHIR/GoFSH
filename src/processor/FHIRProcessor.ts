import { utils } from 'fsh-sushi';
import semver from 'semver';
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
import { InstanceProcessor } from './InstanceProcessor';

export class FHIRProcessor {
  constructor(
    private readonly lake: LakeOfFHIR,
    private readonly fisher?: utils.Fishable,
    private readonly igPath: string = null
  ) {
    // If no fisher was passed in, just use the built-in lake fisher (usually for testing only)
    if (fisher == null) {
      fisher = lake;
    }
  }

  getFisher(): utils.Fishable {
    return this.fisher;
  }

  processConfig(externalDeps?: string[]): ExportableConfiguration {
    let config: ExportableConfiguration;
    const igForConfig =
      this.lake.getAllImplementationGuides().find(doc => doc.path === this.igPath) ??
      this.lake.getAllImplementationGuides()[0];
    if (this.lake.getAllImplementationGuides().length > 0) {
      config = ConfigurationProcessor.process(igForConfig.content);
    } else {
      config = ConfigurationExtractor.process(
        [
          ...this.lake.getAllStructureDefinitions(),
          ...this.lake.getAllCodeSystems(),
          ...this.lake.getAllValueSets()
        ].map(wild => wild.content)
      );
    }
    if (externalDeps?.length > 0) {
      const existingIds: string[] = [];
      config.config.dependencies = config.config.dependencies || [];
      externalDeps.forEach(dep => {
        const [id, version] = dep.split('@');
        config.config.dependencies.forEach(element => {
          existingIds.push(element.packageId);
          if (element.packageId === id && element.version !== version) {
            if (semver.gt(version, element.version)) element.version = version;
          }
        });
        if (!existingIds.includes(id)) {
          const newDep = {
            packageId: id,
            version: version
          };
          config.config.dependencies.push(newDep);
        }
      });
    }
    return config;
  }

  process(config: ExportableConfiguration): Package {
    const resources = new Package();
    const igForConfig =
      this.lake.getAllImplementationGuides().find(doc => doc.path === this.igPath) ??
      this.lake.getAllImplementationGuides()[0];
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
    this.lake.getAllCodeSystems(false).forEach(wild => {
      try {
        resources.add(CodeSystemProcessor.process(wild.content, this.fisher));
      } catch (ex) {
        logger.error(`Could not process CodeSystem at ${wild.path}: ${ex.message}`);
      }
    });
    this.lake.getAllValueSets(false).forEach(wild => {
      try {
        resources.add(ValueSetProcessor.process(wild.content, this.fisher));
      } catch (ex) {
        logger.error(`Could not process ValueSet at ${wild.path}: ${ex.message}`);
      }
    });
    this.lake.getAllInstances(true).forEach(wild => {
      try {
        resources.add(InstanceProcessor.process(wild.content, igForConfig?.content, this.fisher));
      } catch (ex) {
        logger.error(`Could not process Instance at ${wild.path}: ${ex.message}`);
      }
    });
    return resources;
  }
}
