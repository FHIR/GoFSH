import { capitalize, compact } from 'lodash';
import { ExportableCodeSystem, ExportableConceptRule } from '../exportable';
import { ProcessableConceptDefinition } from '.';
import { fhirtypes } from 'fsh-sushi';

export class CodeSystemProcessor {
  static process(input: any): ExportableCodeSystem {
    // We need something to call the CodeSystem, so it must have a name or id
    if (input.name != null || input.id != null) {
      // Prefer name (which is optional), otherwise create a reasonable name from the id with only allowable characters
      const name = input.name ?? input.id.split(/[-.]+/).map(capitalize).join('');
      const codeSystem = new ExportableCodeSystem(name);
      const concepts = compact<ProcessableConceptDefinition>(
        input.concept?.map((rawConcept: any) => {
          if (CodeSystemProcessor.isCodeSystemConcept(rawConcept)) {
            return {
              ...rawConcept,
              processedPaths: []
            } as ProcessableConceptDefinition;
          }
        }) ?? []
      );
      CodeSystemProcessor.extractKeywords(input, codeSystem);
      CodeSystemProcessor.extractRules(input, concepts, codeSystem);
      return codeSystem;
    }
  }

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

  static extractRules(
    input: any,
    concepts: ProcessableConceptDefinition[],
    target: ExportableCodeSystem
  ): void {
    concepts.forEach(concept => {
      target.rules.push(
        new ExportableConceptRule(concept.code, concept.display, concept.definition)
      );
      concept.processedPaths.push('code', 'display', 'definition');
    });
  }

  static isCodeSystemConcept(input: any): input is fhirtypes.CodeSystemConcept {
    return input.code != null;
  }
}
