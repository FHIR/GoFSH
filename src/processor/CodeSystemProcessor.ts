import { ExportableCodeSystem } from '../exportable';

export class CodeSystemProcessor {
  static extractKeywords(input: any, target: ExportableCodeSystem): void {
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

  static process(input: any): ExportableCodeSystem {
    if (input.name) {
      const codeSystem = new ExportableCodeSystem(input.name);
      CodeSystemProcessor.extractKeywords(input, codeSystem);
      return codeSystem;
    }
  }
}
