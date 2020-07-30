import { CodeSystem } from 'fsh-sushi/dist/fhirtypes';
import { ExportableCodeSystem } from '../exportable';

export class CodeSystemProcessor {
  extractKeywords(input: CodeSystem, target: ExportableCodeSystem): void {
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

  process(input: CodeSystem): ExportableCodeSystem {
    const codeSystem = new ExportableCodeSystem(input.name);
    this.extractKeywords(input, codeSystem);
    return codeSystem;
  }
}
