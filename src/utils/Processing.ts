import fs from 'fs-extra';
import path from 'path';
import ini from 'ini';
import { fhirdefs } from 'fsh-sushi';
import { logger } from './GoFSHLogger';
import { Package, FHIRProcessor, LakeOfFHIR, WildFHIR, FHIRResource } from '../processor';
import { FSHExporter } from '../export/FSHExporter';
import { loadOptimizers } from '../optimizer';
import { MasterFisher } from '../utils';
import { ExportableConfiguration } from '../exportable';

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
export function getFhirProcessor(inDir: string, defs: fhirdefs.FHIRDefinitions) {
  const lake = getLakeOfFHIR(inDir);
  const igIniIgPath = getIgPathFromIgIni(inDir);
  const fisher = new MasterFisher(lake, defs);
  return new FHIRProcessor(lake, fisher, igIniIgPath);
}

export async function getResources(
  processor: FHIRProcessor,
  config: ExportableConfiguration
): Promise<Package> {
  const fisher = processor.getFisher();
  const resources = processor.process(config);
  // Dynamically load and run the optimizers
  const optimizers = await loadOptimizers();
  optimizers.forEach(opt => {
    logger.debug(`Running optimizer ${opt.name}: ${opt.description}`);
    opt.optimize(resources, fisher);
  });
  return resources;
}

export function writeFSH(resources: Package, outDir: string, style: string): void {
  const exporter = new FSHExporter(resources);
  try {
    const resourceDir = path.join(outDir, 'input', 'fsh');
    fs.ensureDirSync(resourceDir);
    exporter.export(style).forEach((content, name) => {
      fs.writeFileSync(path.join(resourceDir, name), content);
    });
    logger.info(`Wrote fsh to ${resourceDir}.`);
    if (resources.configuration) {
      const configPath = path.join(outDir, 'sushi-config.yaml');
      fs.writeFileSync(configPath, resources.configuration.toFSH());
      logger.info(`Wrote config to ${configPath}.`);
    }
  } catch (error) {
    logger.error(`Could not write to output directory: ${error.message}`);
    process.exit(1);
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
      if (isProcessableContent(content, file)) {
        docs.push(new WildFHIR(content, file));
      }
    } catch (ex) {
      logger.error(`Could not load ${file}: ${ex.message}`);
    }
  });
  return new LakeOfFHIR(docs);
}

export function isProcessableContent(content: any, source?: string): content is FHIRResource {
  if (typeof content !== 'object' || content.resourceType == null) {
    logger.debug(`Skipping non-FHIR input: ${source}`);
    return false;
  } else if (/^http:\/\/hl7.org\/fhir\/comparison\//.test(content.url)) {
    // The IG Publisher creates weird "Intersection" and "Union" SD files, so this check filters them out
    logger.debug(`Skipping temporary "comparison" resource created by IG Publisher: ${source}`);
    return false;
  } else {
    return true;
  }
}

export function getIgPathFromIgIni(inDir: string): string {
  let igPath;
  const igIniPath = getFilesRecursive(inDir).find(file => path.parse(file).base === 'ig.ini');
  if (igIniPath) {
    try {
      const igIni = ini.parse(fs.readFileSync(igIniPath, 'utf-8'));
      if (igIni.IG?.ig) {
        igPath = path.join(path.dirname(igIniPath), igIni.IG.ig);
      }
    } catch {}
  }
  return igPath;
}

// thanks, peturv
export function getFilesRecursive(dir: string): string[] {
  if (fs.statSync(dir).isDirectory()) {
    const ancestors = fs.readdirSync(dir, 'utf8').map(f => {
      // Don't get any files in .git folder or in a child temp folder
      if (f === 'temp' || f === '.git') {
        logger.debug(`Skipping ${f} folder: ${path.join(dir, f)}`);
        return [];
      }
      return getFilesRecursive(path.join(dir, f));
    });
    return [].concat(...ancestors);
  } else {
    // IG Publisher creates .escaped.json files that are not valid JSON
    if (
      dir.endsWith('.escaped.json') ||
      IGNORED_RESOURCE_LIKE_FILES.some(path => dir.endsWith(path))
    ) {
      logger.debug(`Skipping ${dir} file`);
      return [];
    }
    return [dir];
  }
}

const IGNORED_RESOURCE_LIKE_FILES = [
  // If expansions.json is in an output directory, it was likely generated by the IG Publisher
  // Since it is a generated file and it can be large, we skip processing it
  `output${path.sep}expansions.json`,
  // These template files do not contain valid JSON. Since they are template files, we skip processing them.
  `template${path.sep}onGenerate-validation.json`,
  `template${path.sep}ongenerate-validation-igqa.json`,
  `template${path.sep}ongenerate-validation-jira.json`
];
