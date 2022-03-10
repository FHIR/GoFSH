import path from 'path';
import { fhirdefs } from 'fsh-sushi';
import { loadFromPath } from 'fhir-package-loader';

export function loadTestDefinitions(): fhirdefs.FHIRDefinitions {
  const defs = new fhirdefs.FHIRDefinitions();
  loadFromPath(path.join(__dirname), 'testdefs', defs);
  return defs;
}
