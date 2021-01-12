#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import program from 'commander';
import chalk from 'chalk';
import { pad, padStart, padEnd } from 'lodash';
import { fhirdefs, fhirtypes, utils } from 'fsh-sushi';

import {
  ensureOutputDir,
  getInputDir,
  getFhirProcessor,
  getResources,
  loadExternalDependencies,
  writeFSH
} from './utils/Processing';
import { logger, stats, fshingTrip, getRandomPun } from './utils';
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
      '-f, --fshing-trip',
      'run SUSHI on the output of GoFSH and generate a comparison of the round trip results'
    )
    .option(
      '-i, --installed-sushi',
      'use the locally installed version of SUSHI when generating comparisons with the "-f" option'
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

  let pkg: Package;
  try {
    pkg = await getResources(processor, config);
  } catch (err) {
    logger.error(`Could not use input directory: ${err.message}`);
    process.exit(1);
  }

  writeFSH(pkg, outDir, program.style);

  const prNum = pad(pkg.profiles.length.toString(), 8);
  const extnNum = pad(pkg.extensions.length.toString(), 10);
  const vstNum = pad(pkg.valueSets.length.toString(), 9);
  const cdsysNum = pad(pkg.codeSystems.length.toString(), 11);
  const insNum = pad(pkg.instances.length.toString(), 9);
  const invrNum = pad(pkg.invariants.length.toString(), 10);
  const mpNum = pad(pkg.mappings.length.toString(), 8);
  const errorNumMsg = pad(`${stats.numError} Error${stats.numError !== 1 ? 's' : ''}`, 13);
  const wrNumMsg = padStart(`${stats.numWarn} Warning${stats.numWarn !== 1 ? 's' : ''}`, 12);

  const aWittyMessageInvolvingABadFishPun = padEnd(getRandomPun(stats.numError, stats.numWarn), 60);
  const clr =
    stats.numError > 0 ? chalk.red : stats.numWarn > 0 ? chalk.rgb(179, 98, 0) : chalk.green;

  // prettier-ignore
  const results = [
    // NOTE: Doing some funky things w/ strings on some lines to keep overall alignment in the code
    clr('╔' + '════════════════════════════════════ GoFSH RESULTS ══════════════════════════════════════' + '' + '╗'),
    clr('║') + ' ╭──────────┬────────────┬───────────┬─────────────┬───────────┬────────────┬──────────╮ ' + clr('║'),
    clr('║') + ' │ Profiles │ Extensions │ ValueSets │ CodeSystems │ Instances │ Invariants │ Mappings │ ' + clr('║'),
    clr('║') + ' ├──────────┼────────────┼───────────┼─────────────┼───────────┼────────────┼──────────┤ ' + clr('║'),
    clr('║') + ` │ ${prNum} │ ${extnNum} │ ${vstNum} │ ${cdsysNum} │ ${insNum} │ ${invrNum} │ ${mpNum} │ ` + clr('║'),
    clr('║') + ' ╰──────────┴────────────┴───────────┴─────────────┴───────────┴────────────┴──────────╯ ' + clr('║'),
    clr('║' + '                                                                                         ' + '' + '║'),
    clr('╠' + '═════════════════════════════════════════════════════════════════════════════════════════' + '' + '╣'),
    clr('║') + ` ${            aWittyMessageInvolvingABadFishPun            } ${errorNumMsg} ${wrNumMsg} ` + clr('║'),
    clr('╚' + '═════════════════════════════════════════════════════════════════════════════════════════' + '' + '╝')
  ];

  console.log();
  results.forEach(r => console.log(r));

  if (program.fshingTrip) {
    fshingTrip(inDir, outDir, program.installedSushi);
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
