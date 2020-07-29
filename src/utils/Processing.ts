import fs from 'fs-extra';
import path from 'path';
import { Package, FHIRProcessor } from '../processor';
import { FSHExporter } from '../export/FSHExporter';

export function getInputDir(input = '.'): string {
  // default to current directory
  return input;
}

export function ensureOutputDir(output = path.join('.', 'fsh')): string {
  fs.ensureDirSync(output);
  return output;
}

export function getResources(inDir: string) {
  const resources = new Package();
  const processor = new FHIRProcessor();
  const files = getFilesRecursive(inDir).filter(file => file.endsWith('.json'));
  files.forEach(file => {
    try {
      resources.add(processor.process(file));
    } catch (ex) {
      console.log(ex);
    }
  });
  return resources;
}

export function writeFSH(resources: Package, outDir: string) {
  const exporter = new FSHExporter(resources);
  const outputPath = path.join(outDir, 'resources.fsh');
  fs.writeFileSync(outputPath, exporter.export());
  console.log(`Wrote fsh to ${outputPath}.`);
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
