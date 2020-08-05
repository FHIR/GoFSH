import fs from 'fs-extra';
import path from 'path';
import { Package, FHIRProcessor } from '../processor';
import { FSHExporter } from '../export/FSHExporter';
import { logger } from './GoFSHLogger';

export function getInputDir(input = '.'): string {
  // default to current directory
  logger.info(`Using input directory: ${input}`);
  return input;
}

export function ensureOutputDir(output = path.join('.', 'fsh')): string {
  try {
    fs.ensureDirSync(output);
  } catch (err) {}
  logger.info(`Using output directory: ${output}`);
  return output;
}

export function getResources(inDir: string) {
  const resources = new Package();
  const processor = new FHIRProcessor();
  const files = getFilesRecursive(inDir).filter(file => file.endsWith('.json'));
  logger.info(`Found ${files.length} JSON files.`);
  files.forEach(file => {
    try {
      resources.add(processor.process(file));
    } catch (ex) {
      logger.error(`Could not process ${file}: ${ex.message}`);
    }
  });
  resources.optimize(processor);
  return resources;
}

export function writeFSH(resources: Package, outDir: string) {
  const exporter = new FSHExporter(resources);
  const outputPath = path.join(outDir, 'resources.fsh');
  fs.writeFileSync(outputPath, exporter.export());
  logger.info(`Wrote fsh to ${outputPath}.`);
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
