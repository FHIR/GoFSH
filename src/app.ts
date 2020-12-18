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
import { logger, stats, fshingTrip } from './utils';
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
    .option(
      '-s, --style <style>',
      'specify how the output is organized into files: group-by-fsh-type (default), group-by-profile, single-file, file-per-definition'
    )
    .option(
      '-f, --fshing-trip [use-local-sushi]',
      'run SUSHI on the output of GoFSH and generate a comparison of the round trip results. ' +
        'Add "use-local-sushi" after flag to use your locally installed version of SUSHI'
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

  // Trim empty spaces from command line dependencies
  const dependencies = program.dependency?.map((dep: string) => dep.trim());

  // Load FhirProcessor and config object
  const processor = getFhirProcessor(inDir, defs);
  const config = processor.processConfig(dependencies);

  // Load dependencies from config for GoFSH processing
  const allDependencies = config.config.dependencies?.map(
    (dep: fhirtypes.ImplementationGuideDependsOn) => `${dep.packageId}@${dep.version}`
  );
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
    resources = await getResources(processor, config);
  } catch (err) {
    logger.error(`Could not use input directory: ${err.message}`);
    process.exit(1);
  }

  writeFSH(resources, outDir, program.style);

  logger.info(`Errors: ${stats.numError}`);
  logger.info(`Warnings: ${stats.numWarn}`);
  logger.info('Thank you for using goFSH.');

  if (program.fshingTrip) {
    fshingTrip(inDir, outDir, program.fshingTrip === 'use-local-sushi');
  }

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
