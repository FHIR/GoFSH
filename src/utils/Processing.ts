import fs from 'fs-extra';
import path from 'path';
import { fhirdefs } from 'fsh-sushi';
import { logger } from './GoFSHLogger';
import { Package, FHIRProcessor, LakeOfFHIR, WildFHIR } from '../processor';
import { FSHExporter } from '../export/FSHExporter';
import { loadOptimizers } from '../optimizer';
import { MasterFisher } from '../utils';

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

export async function getResources(
  inDir: string,
  defs: fhirdefs.FHIRDefinitions
): Promise<Package> {
  const lake = getLakeOfFHIR(inDir);
  const fisher = new MasterFisher(lake, defs);
  const processor = new FHIRProcessor(lake, fisher);
  const resources = processor.process();
  // Dynamically load and run the optimizers
  const optimizers = await loadOptimizers();
  optimizers.forEach(opt => {
    logger.debug(`Running optimizer ${opt.name}: ${opt.description}`);
    opt.optimize(resources, fisher);
  });
  return resources;
}

export function writeFSH(resources: Package, outDir: string): void {
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

function getLakeOfFHIR(inDir: string): LakeOfFHIR {
  const files = getFilesRecursive(inDir).filter(file => file.endsWith('.json'));
  logger.info(`Found ${files.length} JSON files.`);
  const docs: WildFHIR[] = [];
  files.forEach(file => {
    try {
      const content = fs.readJSONSync(file);
      // First do a very baseline check to ensure this is a FHIR Resource
      if (typeof content !== 'object' || content.resourceType == null) {
        logger.debug(`Skipping non-FHIR JSON file: ${file}`);
      } else if (/^http:\/\/hl7.org\/fhir\/comparison\//.test(content.url)) {
        // The IG Publisher creates weird "Intersection" and "Union" SD files, so this check filters them out
        logger.debug(`Skipping temporary "comparison" file created by IG Publisher: ${file}`);
      } else {
        docs.push(new WildFHIR(content, file));
      }
    } catch (ex) {
      logger.error(`Could not load ${file}: ${ex.message}`);
    }
  });
  return new LakeOfFHIR(docs);
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
