import path from 'path';
import chalk from 'chalk';
import { createTwoFilesPatch } from 'diff';
import { execSync } from 'child_process';
import temp from 'temp';
import { union } from 'lodash';
import fs from 'fs-extra';

import { getFilesRecursive, logger } from '.';

export function fshingTrip(inDir: string, outDir: string, useLocalSUSHI: boolean): void {
  // Make a pretty box to let the user know we are going into SUSHI mode
  // NOTE: If we add a box to the end of GoFSH output, it may make sense to modify this
  // so we don't have double boxes
  const clr = chalk.green;
  [
    clr('╔═════════════════════════════════════════════════════════════════╗'),
    clr('║') + '             Generating round trip results via SUSHI             ' + clr('║'),
    clr('╚═════════════════════════════════════════════════════════════════╝')
  ].forEach(line => console.log(line));

  // If we run with "npx", then the version GoFSH depends on will be used. Otherwise if the
  // user sets the "use-local-sushi" flag, use their globally installed SUSHI
  try {
    execSync(`${useLocalSUSHI ? '' : 'npx '}sushi ${outDir}`, { stdio: 'inherit' });
  } catch {
    logger.warn('SUSHI finished with errors, this may affect the resulting comparison');
  }
  const inputFilesMap = getFilesMap(inDir);
  const outputFilesMap = getFilesMap(outDir);
  const files = union(Array.from(inputFilesMap.keys()), Array.from(outputFilesMap.keys()));
  files.sort();

  temp.track();
  const diffFile = temp.openSync({ suffix: '.diff' });

  files.forEach(file => {
    const inputFilePath = inputFilesMap.get(file) ?? path.join(inDir, file);
    const outputFilePath = outputFilesMap.get(file) ?? path.join(outDir, file);
    const inputFileJSON = fs.existsSync(inputFilePath) ? fs.readJSONSync(inputFilePath) : '';
    const outputFileJSON = fs.existsSync(outputFilePath) ? fs.readJSONSync(outputFilePath) : '';

    // It is best to remove the snapshot, since otherwise it tends to align with the differential in the
    // diff, creating a pretty meaningless diff
    if (inputFileJSON.snapshot) {
      inputFileJSON.snapshot =
        'NOTE: Snapshots are not generated by SUSHI, so this element is omitted for sake of comparison';
    }

    const patch = createTwoFilesPatch(
      path.relative(process.cwd(), inputFilePath),
      path.relative(process.cwd(), outputFilePath),
      JSON.stringify(inputFileJSON, null, 2),
      JSON.stringify(outputFileJSON, null, 2)
    );
    if (!/@@/.test(patch)) {
      // No difference found
      return;
    }
    fs.appendFileSync(diffFile.fd, patch, { encoding: 'utf8' });
  });
  try {
    execSync(
      `npx diff2html -i file -s side -F fshing-trip-comparison.html --hwt ${path.join(
        __dirname,
        'template.html'
      )} -- ${diffFile.path}`,
      { cwd: outDir }
    );
    logger.info(`Generated comparison file to ${path.join(outDir, 'fshing-trip-comparison.html')}`);
  } catch (e) {
    logger.error(`Comparison generation failed with error: ${e.message}`);
  }
}

function getFilesMap(dir: string): Map<string, string> {
  const files = getFilesRecursive(dir).filter(file => file.endsWith('.json'));
  const filesMap = new Map<string, string>();
  files.forEach(file => filesMap.set(path.basename(file), file));
  return filesMap;
}
