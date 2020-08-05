import { fhirtypes } from 'fsh-sushi';

// TODO: make this handle more complex paths involving slices
export function getPath(element: fhirtypes.ElementDefinition): string {
  return element.path.slice(element.path.indexOf('.') + 1);
}
