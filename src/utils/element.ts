import { ElementDefinition } from 'fsh-sushi/dist/fhirtypes';

// TODO: make this handle more complex paths involving slices
export function getPath(element: ElementDefinition): string {
  return element.path.slice(element.path.indexOf('.') + 1);
}
