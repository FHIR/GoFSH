import semver from 'semver';
import { MasterFisher, logger, ProcessingOptions } from '../utils';
import {
  StructureDefinitionProcessor,
  CodeSystemProcessor,
  ValueSetProcessor,
  Package,
  LakeOfFHIR,
  WildFHIR
} from '.';
import { ExportableConfiguration } from '../exportable';
import { ExportableAlias } from '../exportable';
import { ConfigurationExtractor } from '../extractor';
import { InstanceProcessor } from './InstanceProcessor';

export class FHIRProcessor {
  constructor(
    private readonly lake: LakeOfFHIR,
    private readonly fisher?: MasterFisher,
    private readonly igPath: string = null
  ) {
    // If no fisher was passed in, just use the built-in lake fisher (usually for testing only)
    if (fisher == null) {
      fisher = new MasterFisher(lake);
    }
  }

  getFisher(): MasterFisher {
    return this.fisher;
  }

  getLakeOfFHIR(): LakeOfFHIR {
    return this.lake;
  }

  processConfig(externalDeps?: string[], specifiedFHIRVersion?: string): ExportableConfiguration {
    const igForConfig =
      this.lake.getAllImplementationGuides().find(doc => doc.path === this.igPath) ??
      this.lake.getAllImplementationGuides()[0];
    const resources = [
      ...this.lake.getAllStructureDefinitions(),
      ...this.lake.getAllCodeSystems(),
      ...this.lake.getAllValueSets()
    ].map(wild => wild.content);
    if (igForConfig) {
      resources.push(igForConfig.content);
    }
    const config = ConfigurationExtractor.process(resources, specifiedFHIRVersion);
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

  // Outputs a counter for each resource type being processed
  outputCount(fhirArr: WildFHIR[], index: number, type: string) {
    if (index == fhirArr.length - 1) {
      // Ideally, we want the logger to overwrite the previous count,
      // but since we've encountered issues, we'll remove it for now
      // process.stdout.write('\x1b[A\r');
      let finalMessage = `Processed ${fhirArr.length} ${type}`;
      if (fhirArr.length === 1) {
        logger.info(finalMessage.padEnd(45));
        return;
      } else {
        finalMessage = finalMessage.concat('s');
        logger.info(finalMessage.padEnd(45));
        return;
      }
    } else if ((index + 1) % 5 == 0) {
      // Ideally, we want the logger to overwrite the previous count
      // but since we've encountered issues, we'll remove it for now
      // process.stdout.write('\x1b[A\r');
      logger.info(`Processed ${index + 1} of ${fhirArr.length} ${type}s...\r`);
    }
  }

  process(
    config: ExportableConfiguration,
    options: ProcessingOptions = {},
    aliases: ExportableAlias[] = []
  ): Package {
    const resources = new Package();
    const igForConfig =
      this.lake.getAllImplementationGuides().find(doc => doc.path === this.igPath) ??
      this.lake.getAllImplementationGuides()[0];
    resources.add(config);
    if (aliases.length > 0) logger.info('Processing Aliases...');
    aliases.forEach(alias => resources.add(alias));
    const structureDefs = this.lake.getAllStructureDefinitions();
    if (structureDefs.length > 0) logger.info('Processing StructureDefinitions...');
    structureDefs.forEach((wild, index) => {
      try {
        StructureDefinitionProcessor.process(
          wild.content,
          this.fisher,
          config.config,
          resources.invariants
        ).forEach(resource => {
          resources.add(resource);
        });
        this.outputCount(structureDefs, index, 'StructureDefinition');
      } catch (ex) {
        logger.error(`Could not process StructureDefinition at ${wild.path}: ${ex.message}`);
      }
    });
    const codeSystems = this.lake.getAllCodeSystems(false);
    if (codeSystems.length > 0) logger.info('Processing CodeSystems...');
    codeSystems.forEach((wild, index) => {
      try {
        resources.add(CodeSystemProcessor.process(wild.content, this.fisher, config.config));
        this.outputCount(codeSystems, index, 'CodeSystem');
      } catch (ex) {
        logger.error(`Could not process CodeSystem at ${wild.path}: ${ex.message}`);
      }
    });
    const valueSets = this.lake.getAllValueSets(false);
    if (valueSets.length > 0) logger.info('Processing ValueSets...');
    valueSets.forEach((wild, index) => {
      try {
        resources.add(ValueSetProcessor.process(wild.content, this.fisher, config.config));
        this.outputCount(valueSets, index, 'ValueSet');
      } catch (ex) {
        logger.error(`Could not process ValueSet at ${wild.path}: ${ex.message}`);
      }
    });
    const instances = this.lake.getAllInstances(true);
    if (instances.length > 0) logger.info('Processing Instances...');
    instances.forEach((wild, index) => {
      try {
        if (wild.large) {
          logger.info(
            `Instance ${wild.content.id} is especially large. Processing may take a while.`
          );
        }
        resources.add(
          InstanceProcessor.process(wild.content, igForConfig?.content, this.fisher, options)
        );
        this.outputCount(instances, index, 'Instance');
      } catch (ex) {
        logger.error(`Could not process Instance at ${wild.path}: ${ex.message}`);
      }
    });
    return resources;
  }
}
