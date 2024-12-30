import { LakeOfFHIR, WildFHIR } from '../../src/processor';
import { readJSONorXML } from '../../src/utils';

export async function stockLake(...paths: string[]): Promise<LakeOfFHIR> {
  const lake = new LakeOfFHIR([]);
  await restockLake(lake, ...paths);
  return lake;
}

export async function restockLake(lake: LakeOfFHIR, ...paths: string[]): Promise<void> {
  paths.forEach(p => {
    const importedFile = readJSONorXML(p);
    lake.docs.push(new WildFHIR(importedFile, p));
  });
  await lake.prepareDefs();
}
