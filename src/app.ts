#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import program from 'commander';

import { getInputDir, ensureOutputDir, getResources, writeFSH } from './utils/Processing';
import { logger, stats } from './utils';
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
    .option('-d, --debug', 'output extra debugging information')
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

  if (program.debug) {
    logger.level = 'debug';
  }

  logger.info(`Starting goFSH ${getVersion()}`);

  inDir = getInputDir(inDir);
  let outDir: string;
  try {
    outDir = ensureOutputDir(program.out);
  } catch (err) {
    logger.error(`Could not use output directory: ${err.message}`);
    process.exit(1);
  }
  let resources: Package;
  try {
    resources = getResources(inDir);
  } catch (err) {
    logger.error(`Could not use input directory: ${err.message}`);
    process.exit(1);
  }
  writeFSH(resources, outDir);

  logger.debug(`Errors: ${stats.numError}`);
  logger.debug(`Warnings: ${stats.numWarn}`);
  logger.debug(`Info: ${stats.numInfo}`);
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
