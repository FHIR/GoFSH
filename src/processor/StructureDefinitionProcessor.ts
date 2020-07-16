import { StructureDefinition } from 'fsh-sushi/dist/fhirtypes';

export abstract class AbstractSDProcessor {
  extractKeywords(input: StructureDefinition, target: ConstrainableEntity): void {
    // Usually name is already set (by constructor), but it doesn't hurt to be sure
    target.name = input.name;
    if (input.id) {
      target.id = input.id;
    }
    if (input.title) {
      target.title = input.title;
    }
    if (input.description) {
      target.description = input.description;
    }
  }
}

interface ConstrainableEntity {
  name: string;
  id: string;
  title?: string;
  description?: string;
}
