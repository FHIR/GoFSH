import { CodeSystem } from 'fsh-sushi/dist/fhirtypes';
import { FshCodeSystem } from 'fsh-sushi/dist/fshtypes';

export class CodeSystemProcessor {
  extractKeywords(input: CodeSystem, target: FshCodeSystem): void {
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

  process(input: CodeSystem): FshCodeSystem {
    const codeSystem = new FshCodeSystem(input.name);
    this.extractKeywords(input, codeSystem);
    return codeSystem;
  }
}
