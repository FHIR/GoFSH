import { capitalize, compact, difference } from 'lodash';
import { flatten } from 'flat';
import { utils, fhirtypes, fshtypes } from 'fsh-sushi';
import { ExportableCodeSystem, ExportableConceptRule } from '../exportable';
import { CaretValueRuleExtractor } from '../extractor';

const SUPPORTED_CONCEPT_PATHS = ['code', 'display', 'definition'];

export class CodeSystemProcessor {
  static extractKeywords(input: ProcessableCodeSystem, target: ExportableCodeSystem): void {
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
    input: ProcessableCodeSystem,
    target: ExportableCodeSystem,
    fisher: utils.Fishable,
    config: fshtypes.Configuration
  ): void {
    const newRules: ExportableCodeSystem['rules'] = [];
    newRules.push(
      ...CaretValueRuleExtractor.processResource(input, fisher, input.resourceType, config)
    );
    input.concept?.forEach((concept: any) => {
      newRules.push(new ExportableConceptRule(concept.code, concept.display, concept.definition));
    });
    target.rules = compact(newRules);
  }

  static process(
    input: any,
    fisher: utils.Fishable,
    config: fshtypes.Configuration
  ): ExportableCodeSystem {
    // It must be representable using the FSH CodeSystem syntax
    if (this.isProcessableCodeSystem(input)) {
      // Prefer name (which is optional), otherwise create a reasonable name from the id with only allowable characters
      const name = input.name ?? input.id.split(/[-.]+/).map(capitalize).join('');
      const codeSystem = new ExportableCodeSystem(name);
      CodeSystemProcessor.extractKeywords(input, codeSystem);
      CodeSystemProcessor.extractRules(input, codeSystem, fisher, config);
      return codeSystem;
    }
  }

  // Ensures that a CodeSystem instance is fully representable using the CodeSystem syntax in FSH.
  // For example, if there is no name or id we cannot process it.  In addition, if a concept has an
  // extension, designation, property, etc., then we can't represent it in FSH CodeSystem syntax.
  // It must be represented using Instance instead.
  static isProcessableCodeSystem(input: any): input is ProcessableCodeSystem {
    if (input.resourceType !== 'CodeSystem' || (input.name == null && input.id == null)) {
      return false;
    }
    // We support all higher-level paths via caret rules.  We only need to worry about the
    // concept paths because there is no easy way to associate caret rules with them when the special
    // FSH concept syntax is used. First get the flat paths of concept.
    let flatPaths = Object.keys(flatten(input.concept ?? []));
    // Then remove the array indices from the paths (we don't care about them)
    flatPaths = flatPaths.map(p => {
      return p
        .split('.')
        .filter(k => isNaN(parseInt(k)))
        .join('.');
    });
    // Check if there are any paths that are not a supported path
    return difference(flatPaths, SUPPORTED_CONCEPT_PATHS).length === 0;
  }
}

export interface ProcessableCodeSystem {
  resourceType?: 'CodeSystem';
  name?: string;
  id?: string;
  title?: string;
  description?: string;
  concept?: fhirtypes.CodeSystemConcept[];
}
