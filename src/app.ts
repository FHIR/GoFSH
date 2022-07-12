#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import program from 'commander';
import chalk from 'chalk';
import { pad, padStart, padEnd } from 'lodash';
import { fhirdefs, fhirtypes, utils } from 'fsh-sushi';
import {
  determineCorePackageId,
  ensureOutputDir,
  getInputDir,
  getAliasFile,
  getFhirProcessor,
  getResources,
  loadExternalDependencies,
  writeFSH,
  logger,
  stats,
  fshingTrip,
  getRandomPun,
  ProcessingOptions
} from './utils';
import { Package, AliasProcessor } from './processor';
import { ExportableAlias } from './exportable';

const FSH_VERSION = '2.0.0';

app().catch(e => {
  logger.error(`Unexpected error: ${e.message}`);
  process.exit(1);
});

async function app() {
  let inDir: string;
  program
    .name('goFSH')
    .usage('[path-to-fhir-resources] [options]')
    .storeOptionsAsProperties(false)
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
      'specify how the output is organized into files: file-per-definition (default), group-by-fsh-type, group-by-profile, single-file'
    )
    .option(
      '-f, --fshing-trip',
      'run SUSHI on the output of GoFSH and generate a comparison of the round trip results'
    )
    .option(
      '-i, --installed-sushi',
      'use the locally installed version of SUSHI when generating comparisons with the "-f" option'
    )
    .option(
      '-t, --file-type <type>',
      'specify which file types GoFSH should accept as input: json-only (default), xml-only, json-and-xml'
    )
    .option('--indent', 'output FSH with indented rules using context paths')
    .option(
      '--meta-profile <mode>',
      'specify how meta.profile on Instances should be applied to the InstanceOf keyword: only-one (default), first, none'
    )
    .option(
      '-a, --alias-file <alias-filePath>',
      'specify an existing FSH file containing aliases to be loaded.'
    )
    .option('--no-alias', 'output FSH without generating Aliases')
    .option(
      '-u, --useFHIRVersion <fhirVersion>',
      'specify which FHIR version to use when it cannot be inferred'
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
  const programOptions = program.opts();
  const { logLevel } = programOptions;
  if (logLevel === 'debug' || logLevel === 'warn' || logLevel === 'error') {
    logger.level = logLevel; // GoFSH logger
    utils.logger.level = logLevel; // SUSHI logger
  }

  logger.info(`Starting ${getVersion()}`);

  logger.info('Arguments:');
  if (programOptions.logLevel) {
    logger.info(`  --log-level ${programOptions.logLevel}`);
  }
  if (programOptions.dependency) {
    logger.info(`  --dependency ${programOptions.dependency}`);
  }
  if (programOptions.style) {
    logger.info(`  --style ${programOptions.style}`);
  }
  if (programOptions.fshingTrip) {
    logger.info('  --fshing-trip');
  }
  if (programOptions.installedSushi) {
    logger.info('  --installed-sushi');
  }
  if (programOptions.fileType) {
    logger.info(`  --file-type ${programOptions.fileType}`);
  }
  if (programOptions.indent) {
    logger.info('  --indent');
  }
  if (programOptions.metaProfile) {
    logger.info(`  --meta-profile ${programOptions.metaProfile}`);
  }
  if (programOptions.aliasFile) {
    logger.info(`  --alias-file ${programOptions.aliasFile}`);
  }
  if (!programOptions.alias) {
    logger.info('  --no-alias');
  }
  if (programOptions.useFHIRVersion) {
    logger.info(`  --useFHIRVersion ${programOptions.useFHIRVersion}`);
  }
  if (programOptions.out) {
    logger.info(`  --out ${path.resolve(programOptions.out)}`);
  }
  logger.info(`  ${path.resolve(inDir)}`);

  inDir = getInputDir(inDir);

  let outDir: string;
  try {
    outDir = ensureOutputDir(programOptions.out);
  } catch (err) {
    logger.error(`Could not use output directory: ${err.message}`);
    process.exit(1);
  }

  if (!outDir) {
    logger.info('Exiting.');
    process.exit(1);
  }

  // Load dependencies
  const defs = new fhirdefs.FHIRDefinitions();

  // Trim empty spaces from command line dependencies
  const dependencies = programOptions.dependency?.map((dep: string) => dep.trim());

  // Use specified FHIR Version
  const specifiedFHIRVersion = programOptions.useFHIRVersion;
  if (specifiedFHIRVersion && !utils.isSupportedFHIRVersion(specifiedFHIRVersion)) {
    logger.error(`Specified FHIR version is not supported: ${specifiedFHIRVersion}`);
    process.exit(1);
  }

  // Load FhirProcessor and config object
  const fileType = programOptions.fileType?.toLowerCase() ?? 'json-only';
  if (!['json-only', 'xml-only', 'json-and-xml'].includes(fileType)) {
    logger.error(
      `Unsupported "file-type" option: ${fileType}. Valid options are "json-only", "xml-only", and "json-and-xml".`
    );
    process.exit(1);
  }

  const metaProfileBehavior = programOptions.metaProfile?.toLowerCase() ?? 'only-one';
  if (!['only-one', 'first', 'none'].includes(metaProfileBehavior)) {
    logger.error(
      `Unsupported "meta-profile" option: ${metaProfileBehavior}. Valid options are "only-one", "first", and "none".`
    );
    process.exit(1);
  }

  // Load alias file
  let aliases: ExportableAlias[];
  if (programOptions.aliasFile) {
    const aliasFile = getAliasFile(programOptions.aliasFile);
    aliases = AliasProcessor.process(aliasFile);
  }

  // Get options for processors and optimizers
  const processingOptions = {
    indent: programOptions.indent === true,
    metaProfile: metaProfileBehavior,
    alias: programOptions.alias
  } as ProcessingOptions;

  const processor = getFhirProcessor(inDir, defs, fileType);
  const config = processor.processConfig(dependencies, specifiedFHIRVersion);

  // Load dependencies from config for GoFSH processing
  const allDependencies =
    config.config.dependencies?.map(
      (dep: fhirtypes.ImplementationGuideDependsOn) => `${dep.packageId}@${dep.version}`
    ) ?? [];
  const fhirPackageId = determineCorePackageId(config.config.fhirVersion[0]);
  allDependencies.push(`${fhirPackageId}@${config.config.fhirVersion[0]}`);
  const dependencyDefs = loadExternalDependencies(defs, allDependencies);

  await Promise.all(dependencyDefs);

  let pkg: Package;
  try {
    pkg = await getResources(processor, config, processingOptions, aliases);
  } catch (err) {
    logger.error(`Could not use input directory: ${err.message}`);
    process.exit(1);
  }

  writeFSH(pkg, outDir, programOptions.style);

  const proNum = pad(pkg.profiles.length.toString(), 18);
  const extNum = pad(pkg.extensions.length.toString(), 17);
  const logNum = pad(pkg.logicals.length.toString(), 18);
  const resNum = pad(pkg.resources.length.toString(), 18);
  const vsNum = pad(pkg.valueSets.length.toString(), 17);
  const csNum = pad(pkg.codeSystems.length.toString(), 18);
  const instNum = pad(pkg.instances.length.toString(), 18);
  const invNum = pad(pkg.invariants.length.toString(), 17);
  const mapNum = pad(pkg.mappings.length.toString(), 18);
  const aliasNum = pad(pkg.aliases.length.toString(), 18);
  const errNumMsg = pad(`${stats.numError} Error${stats.numError !== 1 ? 's' : ''}`, 12);
  const wrnNumMsg = padStart(`${stats.numWarn} Warning${stats.numWarn !== 1 ? 's' : ''}`, 12);
  const aWittyMessageInvolvingABadFishPun = padEnd(getRandomPun(stats.numError, stats.numWarn), 37);
  const clr =
    stats.numError > 0 ? chalk.red : stats.numWarn > 0 ? chalk.rgb(179, 98, 0) : chalk.green;

  // prettier-ignore
  const results = [
    clr('╔'  + '═════════════════════════ GoFSH RESULTS ═════════════════════════' +     '╗'),
    clr('║') + ' ╭────────────────────┬───────────────────┬────────────────────╮ ' + clr('║'),
    clr('║') + ' │      Profiles      │    Extensions     │      Logicals      │ ' + clr('║'),
    clr('║') + ' ├────────────────────┼───────────────────┼────────────────────┤ ' + clr('║'),
    clr('║') + ` │ ${    proNum     } │ ${    extNum    } │ ${    logNum     } │ ` + clr('║'),
    clr('║') + ' ╰────────────────────┴───────────────────┴────────────────────╯ ' + clr('║'),
    clr('║') + ' ╭────────────────────┬───────────────────┬────────────────────╮ ' + clr('║'),
    clr('║') + ' │     Resources      │     ValueSets     │     CodeSystems    │ ' + clr('║'),
    clr('║') + ' ├────────────────────┼───────────────────┼────────────────────┤ ' + clr('║'),
    clr('║') + ` │ ${    resNum     } │ ${    vsNum     } │ ${     csNum     } │ ` + clr('║'),
    clr('║') + ' ╰────────────────────┴───────────────────┴────────────────────╯ ' + clr('║'),
    clr('║') + ' ╭────────────────────┬───────────────────┬────────────────────╮ ' + clr('║'),
    clr('║') + ' │     Instances      │    Invariants     │      Mappings      │ ' + clr('║'),
    clr('║') + ' ├────────────────────┼───────────────────┼────────────────────┤ ' + clr('║'),
    clr('║') + ` │ ${    instNum    } │ ${    invNum    } │ ${    mapNum     } │ ` + clr('║'),
    clr('║') + ' ╰────────────────────┴───────────────────┴────────────────────╯ ' + clr('║'),
    clr('║') + ' ╭────────────────────┬───────────────────┬────────────────────╮ ' + clr('║'),
    clr('║') + ' │      Aliases       │                   │                    │ ' + clr('║'),
    clr('║') + ' ├────────────────────┼───────────────────┼────────────────────┤ ' + clr('║'),
    clr('║') + ` │ ${    aliasNum   } │                   │                    │ ` + clr('║'),
    clr('║') + ' ╰────────────────────┴───────────────────┴────────────────────╯ ' + clr('║'),
    clr('║') + '                                                                 ' + clr('║'),
    clr('╠'  + '═════════════════════════════════════════════════════════════════' +     '╣'),
    clr('║') + ` ${aWittyMessageInvolvingABadFishPun } ${errNumMsg} ${wrnNumMsg} ` + clr('║'),
    clr('╚'  + '═════════════════════════════════════════════════════════════════' +     '╝')
  ];

  console.log();
  results.forEach(r => console.log(r));

  if (programOptions.fshingTrip) {
    if (fileType === 'xml-only') {
      logger.error('FSHing Trip is not supported for XML inputs.');
      process.exit(1);
    } else if (fileType === 'json-and-xml') {
      logger.warn(
        'FSHing Trip is not supported for XML inputs. Comparisons will only be generated for JSON input files.'
      );
    }

    fshingTrip(inDir, outDir, processor.getLakeOfFHIR(), programOptions.installedSushi);
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
