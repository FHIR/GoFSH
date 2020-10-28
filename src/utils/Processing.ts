import fs from 'fs-extra';
import path from 'path';
import { fhirdefs } from 'fsh-sushi';
import { Package, FHIRProcessor } from '../processor';
import { FSHExporter } from '../export/FSHExporter';
import { logger } from './GoFSHLogger';

export function getInputDir(input = '.'): string {
  // default to current directory
  logger.info(`Using input directory: ${input}`);
  return input;
}

export function ensureOutputDir(output = path.join('.', 'gofsh')): string {
  try {
    fs.ensureDirSync(output);
  } catch (err) {}
  logger.info(`Using output directory: ${output}`);
  return output;
}

export function getResources(inDir: string, defs: fhirdefs.FHIRDefinitions) {
  const processor = new FHIRProcessor(defs);
  const files = getFilesRecursive(inDir).filter(file => file.endsWith('.json'));
  logger.info(`Found ${files.length} JSON files.`);
  files.forEach(file => {
    try {
      processor.register(file);
    } catch (ex) {
      logger.error(`Could not load ${file}: ${ex.message}`);
    }
  });
  const resources = processor.process();
  resources.optimize(processor);
  return resources;
}

export function writeFSH(resources: Package, outDir: string) {
  const exporter = new FSHExporter(resources);
  const outputPath = path.join(outDir, 'resources.fsh');
  fs.writeFileSync(outputPath, exporter.export());
  logger.info(`Wrote fsh to ${outputPath}.`);
  if (resources.configuration) {
    const configPath = path.join(outDir, 'config.yaml');
    fs.writeFileSync(configPath, resources.configuration.toFSH());
    logger.info(`Wrote config to ${configPath}.`);
  }
}

// thanks, peturv
function getFilesRecursive(dir: string): string[] {
  if (fs.statSync(dir).isDirectory()) {
    const ancestors = fs.readdirSync(dir, 'utf8').map(f => getFilesRecursive(path.join(dir, f)));
    return [].concat(...ancestors);
  } else {
    return [dir];
  }
}

export function loadExternalDependencies(
  defs: fhirdefs.FHIRDefinitions,
  dependencies: string[] = []
): Promise<fhirdefs.FHIRDefinitions | void>[] {
  // Automatically include FHIR R4
  if (!dependencies.includes('hl7.fhir.r4.core@4.0.1')) {
    dependencies.push('hl7.fhir.r4.core@4.0.1');
  }

  // Load dependencies
  const dependencyDefs: Promise<fhirdefs.FHIRDefinitions | void>[] = [];
  for (const dep of dependencies) {
    const [packageId, version] = dep.split('@');
    if (version == null) {
      logger.error(
        `Failed to load ${packageId}: No version specified. To specify the version use ` +
          `the format ${packageId}@current`
      );
      continue;
    }
    dependencyDefs.push(
      fhirdefs
        .loadDependency(packageId, version, defs)
        .then(def => {
          return def;
        })
        .catch(e => {
          logger.error(`Failed to load ${dep}: ${e.message}`);
        })
    );
  }
  return dependencyDefs;
}
