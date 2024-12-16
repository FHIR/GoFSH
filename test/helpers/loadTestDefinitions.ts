import path from 'path';
import { DiskBasedVirtualPackage } from 'fhir-package-loader';
import { FHIRDefinitions, logMessage } from '../../src/utils';

export async function loadTestDefinitions(): Promise<FHIRDefinitions> {
  const defs = new FHIRDefinitions();
  await defs.initialize();
  await defs.loadVirtualPackage(
    new DiskBasedVirtualPackage(
      { name: 'gofsh-test-defs', version: '1.0.0' },
      [path.join(__dirname, 'testdefs')],
      {
        log: logMessage,
        allowNonResources: true, // support for logical instances
        recursive: true
      }
    )
  );
  return defs;
}
