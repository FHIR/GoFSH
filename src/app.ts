#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import program from 'commander';

import { getInputDir, ensureOutputDir, getResources, writeFSH } from './utils/Processing';

const FSH_VERSION = '0.13.x';

app().catch(e => {
  console.log(`Unexpected error: ${e.message}`);
  process.exit(1);
});

async function app() {
  let inDir: string;
  program
    .name('goFSH')
    .usage('[path-to-fhir-resources] [options]')
    .option('-o, --out <out>', 'the path to the output folder')
    .version(getVersion(), '-v, --version', 'print goFSH version')
    .on('--help', () => {
      console.log('');
      console.log('Help text goes here!');
    })
    .arguments('[path-to-fsh-defs]')
    .action(function (pathToFhirResources) {
      inDir = pathToFhirResources;
    })
    .parse(process.argv);

  inDir = getInputDir(inDir);
  const outDir = ensureOutputDir(program.out);

  const resources = getResources(inDir);
  writeFSH(resources, outDir);

  console.log('Thank you for using goFSH.');

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
