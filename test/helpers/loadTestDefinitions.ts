import path from 'path';
import { loadFromPath } from 'fhir-package-loader';
import { FHIRDefinitions } from '../../src/utils';

export function loadTestDefinitions(): FHIRDefinitions {
  const defs = new FHIRDefinitions();
  loadFromPath(path.join(__dirname), 'testdefs', defs);
  return defs;
}
