import fs from 'fs-extra';
import path from 'path';
import ini from 'ini';
import readlineSync from 'readline-sync';
import { fhirdefs } from 'fsh-sushi';
import { logger } from './GoFSHLogger';
import { Package, FHIRProcessor, LakeOfFHIR, WildFHIR, FHIRResource } from '../processor';
import { FSHExporter } from '../export/FSHExporter';
import { loadOptimizers } from '../optimizer';
import { MasterFisher } from '../utils';
import { ExportableConfiguration } from '../exportable';
import { Fhir as FHIR } from 'fhir/fhir';

const FHIRConverter = new FHIR();

export function getInputDir(input = '.'): string {
  // default to current directory
  logger.info(`Using input directory: ${input}`);
  return input;
}

export function ensureOutputDir(output = path.join('.', 'gofsh')): string {
  logger.info(`Using output directory: ${output}`);

  fs.ensureDirSync(output);
  if (fs.readdirSync(output).length > 0) {
    const continuationOption = readlineSync.keyIn(
      [
        `Output directory ${output} contains files. How would you like to proceed?`,
        '- [D]elete',
        '- [C]ontinue',
        '- [Q]uit',
        'Choose one [D,C,Q]: '
      ].join('\n'),
      { limit: 'DCQ', cancel: false }
    );
    if (/[Dd]/.test(continuationOption)) {
      fs.emptyDirSync(output);
    } else if (/[Qq]/.test(continuationOption)) {
      return;
    }
  }

  return output;
}
export function getFhirProcessor(inDir: string, defs: fhirdefs.FHIRDefinitions, fileType: string) {
  const lake = getLakeOfFHIR(inDir, fileType);
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
  logger.info('Optimizing FSH definitions to follow best practices...');
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

export function getLakeOfFHIR(inDir: string, fileType: string): LakeOfFHIR {
  const files = getFilesRecursive(inDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  const xmlFiles = files.filter(f => f.endsWith('.xml'));
  const docs: WildFHIR[] = [];

  if (fileType === 'json-only') {
    logger.info(`Found ${jsonFiles.length} JSON files.`);
    loadPrimaryFiles(jsonFiles, docs);
    const nonDuplicateXMLFiles = findNonDuplicateSecondaryFiles(xmlFiles, docs);
    if (nonDuplicateXMLFiles.length > 0) {
      // We only find the first non-duplicate file and warn on it, because warnings for every non-duplicate may be annoying
      logger.warn(
        `${nonDuplicateXMLFiles.length} XML definition(s) found without corresponding JSON definitions (for example, ${nonDuplicateXMLFiles[0]}).` +
          ' These definitions will be ignored since GoFSH is running in "json-only" mode.' +
          ' To process XML definitions along with JSON, set the "-t" flag to "json-and-xml".' +
          ' To process only XML definitions, set the "-t" flag to "xml-only".'
      );
    }
  } else if (fileType === 'xml-only') {
    logger.info(`Found ${xmlFiles.length} XML files.`);
    loadPrimaryFiles(xmlFiles, docs);
    const nonDuplicateJSONFiles = findNonDuplicateSecondaryFiles(jsonFiles, docs);
    if (nonDuplicateJSONFiles.length > 0) {
      // We only find the first non-duplicate file and warn on it, because warnings for every non-duplicate may be annoying
      logger.warn(
        `${nonDuplicateJSONFiles.length} JSON definition(s) found without corresponding XML definitions (for example, ${nonDuplicateJSONFiles[0]}).` +
          ' These definitions will be ignored since GoFSH is running in "xml-only" mode.' +
          ' To process JSON definitions along with XML, set the "-t" flag to "json-and-xml".' +
          ' To process only JSON definitions, set the "-t" flag to "json-only", or leave it unset.'
      );
    }
  } else if (fileType === 'json-and-xml') {
    logger.info(`Found ${jsonFiles.length} JSON files.`);
    loadPrimaryFiles(jsonFiles, docs);
    logger.info(`Found ${xmlFiles.length} XML files.`);
    loadPrimaryFiles(xmlFiles, docs);
  }

  return new LakeOfFHIR(docs);
}

function loadPrimaryFiles(files: string[], docs: WildFHIR[]) {
  files.forEach(file => {
    try {
      const content = readJSONorXML(file);
      if (isProcessableContent(content, file)) {
        docs.push(new WildFHIR(content, file));
      }
    } catch (ex) {
      logger.error(`Could not load ${file}: ${ex.message}`);
    }
  });
}

function findNonDuplicateSecondaryFiles(files: string[], docs: WildFHIR[]): string[] {
  return files.filter(file => {
    try {
      const content = readJSONorXML(file);
      return (
        isProcessableContent(content, file) &&
        content.id &&
        !docs.some(
          existingResource =>
            existingResource.content.resourceType === content.resourceType &&
            existingResource.content.id === content.id
        )
      );
    } catch {} // We don't want to log any errors with the secondary files
  });
}

function readJSONorXML(file: string): any {
  if (file.endsWith('.json')) {
    return fs.readJSONSync(file);
  } else if (file.endsWith('.xml')) {
    return FHIRConverter.xmlToObj(fs.readFileSync(file).toString());
  }
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
      dir.endsWith('-spreadsheet.xml') ||
      IGNORED_RESOURCE_LIKE_FILES.some(path => dir.endsWith(path)) ||
      IGNORED_NON_RESOURCE_DIRECTORIES.some(path => dir.includes(path))
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
  `output${path.sep}expansions.xml`,
  // qa.xml contains FHIR that will only cause us issues, so we skip it
  `output${path.sep}qa.xml`,
  // These template files do not contain valid JSON. Since they are template files, we skip processing them.
  `template${path.sep}onGenerate-validation.json`,
  `template${path.sep}ongenerate-validation-igqa.json`,
  `template${path.sep}ongenerate-validation-jira.json`
];

// Certain directories are common in IG Publisher output, but don't contain any FHIR, and processing
// them will only create confusing errors, so we ignore these directories
const IGNORED_NON_RESOURCE_DIRECTORIES = [
  `input${path.sep}includes`,
  `input${path.sep}pagecontent`,
  `input${path.sep}pages`,
  `input${path.sep}intro-notes`,
  `input${path.sep}images`,
  `input${path.sep}images-source`
];
