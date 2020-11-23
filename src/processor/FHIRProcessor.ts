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
    if (externalDeps && externalDeps.length > 0) {
      const existingIds: string[] = [];
      if (!config.config.dependencies) config.config.dependencies = [];
      externalDeps.forEach(dep => {
        const [id, version] = dep.split('@');
        config.config.dependencies.forEach(element => {
          existingIds.push(element.packageId);
          if (element.packageId === id && element.version !== version) {
            const externalVersionArr = version.split('.').map(Number);
            const igVersionArr = element.version.split('.').map(Number);
            const resolvedVersion = this.resolveVersion(externalVersionArr, igVersionArr);
            element.version = resolvedVersion;
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

  // Resolves version numbers between dependencies, selecting the highest version
  private resolveVersion(externalVersionArr: number[], internalVersionArr: number[]): string {
    let resolvedVersion = '';
    let found = false;
    let i = 0;
    while (!found) {
      if (externalVersionArr[i] && !internalVersionArr[i]) {
        resolvedVersion = externalVersionArr.join('.');
        found = true;
        break;
      }
      if (internalVersionArr[i] && !externalVersionArr[i]) {
        resolvedVersion = internalVersionArr.join('.');
        found = true;
        break;
      }
      if (externalVersionArr[i] !== internalVersionArr[i]) {
        if (externalVersionArr[i] > internalVersionArr[i]) {
          resolvedVersion = externalVersionArr.join('.');
          found = true;
          break;
        } else if (internalVersionArr[i] > externalVersionArr[i]) {
          resolvedVersion = internalVersionArr.join('.');
          break;
        } else i++;
      }
    }
    return resolvedVersion;
  }

  process(): Package {
    const resources = new Package();
    const igForConfig =
      this.lake.getAllImplementationGuides().find(doc => doc.path === this.igPath) ??
      this.lake.getAllImplementationGuides()[0];
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
