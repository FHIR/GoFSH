#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import program from 'commander';
import { fhirdefs, fhirtypes, utils } from 'fsh-sushi';

import {
  ensureOutputDir,
  getInputDir,
  getFhirProcessor,
  getResources,
  loadExternalDependencies,
  writeFSH
} from './utils/Processing';
import { getConfig, logger, stats } from './utils';
import { Package } from './processor';

const FSH_VERSION = '0.13.x';

app().catch(e => {
  logger.error(`Unexpected error: ${e.message}`);
  process.exit(1);
});

async function app() {
  let inDir: string;
  program
    .name('goFSH')
    .usage('[path-to-fhir-resources] [options]')
    .option('-o, --out <out>', 'the path to the output folder')
    .option(
      '-l, --log-level <level>',
      'specify the level of log messages: error, warn, info (default), debug'
    )
    .option(
      '-d, --dependency <dependency...>',
      'specify dependencies to be loaded using format dependencyId@version (FHIR R4 included by default)'
    )
    .version(getVersion(), '-v, --version', 'print goFSH version')
    .on('--help', () => {
      console.log('');
      console.log('goFSH is used to convert JSON FHIR resources');
      console.log('to FSH. This makes it easier to start');
      console.log('using FSH to author FHIR resources.');
    })
    .arguments('[path-to-fsh-defs]')
    .action(function (pathToFhirResources) {
      inDir = pathToFhirResources;
    })
    .parse(process.argv);

  // Set the log level. If no level specified, loggers default to info
  const { logLevel } = program;
  if (logLevel === 'debug' || logLevel === 'warn' || logLevel === 'error') {
    logger.level = logLevel; // GoFSH logger
    utils.logger.level = logLevel; // SUSHI logger
  }

  logger.info(`Starting ${getVersion()}`);

  inDir = getInputDir(inDir);

  // Load dependencies
  const defs = new fhirdefs.FHIRDefinitions();
  let dependencies = program.dependency;

  // Trim empty spaces from commad line dependencies
  dependencies = dependencies?.map((dep: string) => dep.trim());

  const processor = await getFhirProcessor(inDir, defs);
  const config = await getConfig(processor, dependencies);

  const allDependencies = config.config.dependencies?.map(
    (dep: fhirtypes.ImplementationGuideDependsOn) => `${dep.packageId}@${dep.version}`
  );

  // Load dependencies from config for GoFSH processing
  const dependencyDefs = loadExternalDependencies(defs, allDependencies);

  let outDir: string;
  try {
    outDir = ensureOutputDir(program.out);
  } catch (err) {
    logger.error(`Could not use output directory: ${err.message}`);
    process.exit(1);
  }

  await Promise.all(dependencyDefs);

  let resources: Package;
  try {
    resources = await getResources(processor);
    resources.add(config);
  } catch (err) {
    logger.error(`Could not use input directory: ${err.message}`);
    process.exit(1);
  }

  writeFSH(resources, outDir);

  logger.info(`Errors: ${stats.numError}`);
  logger.info(`Warnings: ${stats.numWarn}`);
  logger.info('Thank you for using goFSH.');

  process.exit(0);
}

function getVersion(): string {
  const packageJSONPath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(packageJSONPath)) {
    const goFshVersion = fs.readJSONSync(packageJSONPath)?.version;
    return `goFSH v${goFshVersion} (implements FHIR Shorthand specification v${FSH_VERSION})`;
  }
  return 'unknown';
}
