import { capitalize, compact, clone } from 'lodash';
import { utils, fhirtypes, fshtypes } from 'fsh-sushi';
import {
  ExportableCodeSystem,
  ExportableConceptRule,
  ExportableCaretValueRule
} from '../exportable';
import { CaretValueRuleExtractor } from '../extractor';
import { makeNameSushiSafe } from './common';

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
      newRules.push(...this.extractConceptRules(concept, input, fisher));
    });
    target.rules = compact(newRules);
  }

  static extractConceptRules(
    concept: any,
    codeSystem: ProcessableCodeSystem,
    fisher: utils.Fishable,
    heirarchy?: string[]
  ): (ExportableCaretValueRule | ExportableConceptRule)[] {
    const conceptRules: (ExportableConceptRule | ExportableCaretValueRule)[] = [];
    const newConceptRule = new ExportableConceptRule(
      concept.code,
      concept.display,
      concept.definition
    );
    newConceptRule.hierarchy = heirarchy ?? [];
    conceptRules.push(
      newConceptRule,
      ...CaretValueRuleExtractor.processConcept(
        concept,
        [...newConceptRule.hierarchy, concept.code],
        codeSystem,
        fisher
      )
    );
    if (concept.concept) {
      const heirarchyArr = clone(newConceptRule.hierarchy);
      heirarchyArr.push(concept.code);
      concept.concept.forEach((child: any) => {
        conceptRules.push(...this.extractConceptRules(child, codeSystem, fisher, heirarchyArr));
      });
    }
    return conceptRules;
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
      makeNameSushiSafe(codeSystem);
      return codeSystem;
    }
  }

  // Ensures that a CodeSystem instance is fully representable using the CodeSystem syntax in FSH.
  // If there is no name or id we cannot process it.
  static isProcessableCodeSystem(input: any): input is ProcessableCodeSystem {
    return input.resourceType === 'CodeSystem' && (input.name || input.id);
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
