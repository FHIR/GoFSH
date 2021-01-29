import { fhirdefs, fhirtypes, fshtypes, utils } from 'fsh-sushi';
import {
  getResources,
  isProcessableContent,
  loadExternalDependencies,
  MasterFisher,
  logger,
  errorsAndWarnings,
  ErrorsAndWarnings
} from '../utils';
import { FHIRProcessor, LakeOfFHIR, WildFHIR } from '../processor';
import { FSHExporter } from '../export';

export async function fhirToFsh(
  input: any[],
  options: fhirToFshOptions = {}
): Promise<{
  fsh: string | fshMap;
  configuration: fshtypes.Configuration;
  errors: ErrorsAndWarnings['errors'];
  warnings: ErrorsAndWarnings['warnings'];
}> {
  // Set up the logger
  errorsAndWarnings.reset();
  errorsAndWarnings.shouldTrack = true;
  if (options.logLevel === 'silent') {
    logger.transports[0].silent = true;
    utils.logger.transports[0].silent = true;
  } else if (options.logLevel != null) {
    if (!isLevel(options.logLevel)) {
      return {
        fsh: null,
        errors: [
          {
            message: `Invalid logLevel: ${options.logLevel}. Valid levels include: ${levels.join(
              ', '
            )}.`
          }
        ],
        warnings: [],
        configuration: null
      };
    }
    logger.level = options.logLevel;
    utils.logger.level = options.logLevel;
  }

  // Read in the resources, either as JSON objects or as strings
  const docs: WildFHIR[] = [];
  input.forEach((resource, i) => {
    const location = `Input_${i}`;
    if (typeof resource === 'string') {
      try {
        resource = JSON.parse(resource);
      } catch (e) {
        logger.error(`Could not parse ${location} to JSON`);
        return;
      }
    }
    if (isProcessableContent(resource, location)) {
      docs.push(new WildFHIR(resource, location));
    }
  });

  // Set up the FHIRProcessor
  const lake = new LakeOfFHIR(docs);
  const defs = new fhirdefs.FHIRDefinitions();
  const fisher = new MasterFisher(lake, defs);
  const processor = new FHIRProcessor(lake, fisher);

  // Process the configuration
  const configuration = processor.processConfig(
    (options.dependencies ?? []).map(d => d.replace('#', '@'))
  );

  // Load dependencies, including those inferred from an IG file, and those given as input
  const dependencies = configuration.config.dependencies?.map(
    (dep: fhirtypes.ImplementationGuideDependsOn) => `${dep.packageId}@${dep.version}`
  );
  await Promise.all(loadExternalDependencies(defs, dependencies));

  // Process the FHIR to rules, and then export to FSH
  const pkg = await getResources(processor, configuration);

  // Default to exporting as a single string
  return {
    fsh: new FSHExporter(pkg).apiExport(options.style === 'map' ? 'map' : 'string'),
    configuration: configuration.config,
    errors: errorsAndWarnings.errors,
    warnings: errorsAndWarnings.warnings
  };
}

export type fshMap = {
  aliases: string;
  invariants: Map<string, string>;
  mappings: Map<string, string>;
  profiles: Map<string, string>;
  extensions: Map<string, string>;
  codeSystems: Map<string, string>;
  valueSets: Map<string, string>;
  instances: Map<string, string>;
};

type fhirToFshOptions = {
  dependencies?: string[];
  logLevel?: Level;
  style?: exportStyle;
};

export type exportStyle = 'string' | 'map';

// Winston levels: https://github.com/winstonjs/winston#logging-levels plus a silent option
const levels = ['silly', 'debug', 'verbose', 'http', 'info', 'warn', 'error', 'silent'] as const;
type Level = typeof levels[number];
function isLevel(level: string): level is Level {
  return levels.includes(level as Level);
}
