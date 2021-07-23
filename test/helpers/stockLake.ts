import { LakeOfFHIR, WildFHIR } from '../../src/processor';
import { readJSONorXML } from '../../src/utils';

export function stockLake(...paths: string[]): LakeOfFHIR {
  const lake = new LakeOfFHIR([]);
  restockLake(lake, ...paths);
  return lake;
}

export function restockLake(lake: LakeOfFHIR, ...paths: string[]): void {
  paths.forEach(p => {
    const importedFile = readJSONorXML(p);
    lake.docs.push(new WildFHIR(importedFile, p));
  });
}
