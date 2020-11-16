import path from 'path';
import { fhirdefs } from 'fsh-sushi';

export function loadTestDefinitions(): fhirdefs.FHIRDefinitions {
  const defs = new fhirdefs.FHIRDefinitions();
  fhirdefs.loadFromPath(path.join(__dirname, 'testdefs'), 'testPackage', defs);
  return defs;
}
