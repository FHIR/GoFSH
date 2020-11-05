import fs from 'fs-extra';
import { LakeOfFHIR, WildFHIR } from '../../src/processor';

export function stockLake(...paths: string[]): LakeOfFHIR {
  const lake = new LakeOfFHIR([]);
  restockLake(lake, ...paths);
  return lake;
}

export function restockLake(lake: LakeOfFHIR, ...paths: string[]): void {
  paths.forEach(p => {
    lake.docs.push(new WildFHIR(fs.readJSONSync(p), p));
  });
}
