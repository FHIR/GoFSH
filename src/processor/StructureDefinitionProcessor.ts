import compact from 'lodash/compact';
import { fhirdefs } from 'fsh-sushi';
import { ExportableSdRule } from '../exportable';
import {
  CardRuleExtractor,
  CaretValueRuleExtractor,
  AssignmentRuleExtractor,
  FlagRuleExtractor,
  BindingRuleExtractor,
  ContainsRuleExtractor,
  OnlyRuleExtractor
} from '../rule-extractor';
import { ProcessableElementDefinition } from '.';
import { getAncestorElement } from '../utils';

export abstract class AbstractSDProcessor {
  static extractKeywords(input: ProcessableStructureDefinition, target: ConstrainableEntity): void {
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
    if (input.baseDefinition) {
      target.parent = input.baseDefinition;
    }
  }

  static extractRules(
    input: ProcessableStructureDefinition,
    target: ConstrainableEntity,
    fhir: fhirdefs.FHIRDefinitions
  ): void {
    const newRules: ExportableSdRule[] = [];
    // First extract the top-level caret rules from the StructureDefinition
    newRules.push(...CaretValueRuleExtractor.processStructureDefinition(input, fhir));
    // Then extract rules based on the differential elements
    for (const rawElement of input?.differential?.element ?? []) {
      const element = ProcessableElementDefinition.fromJSON(rawElement, false);
      if (element.sliceName && getAncestorElement(element.id, input, fhir) == null) {
        newRules.push(
          ContainsRuleExtractor.process(element, input, fhir),
          OnlyRuleExtractor.process(element),
          AssignmentRuleExtractor.process(element),
          BindingRuleExtractor.process(element)
        );
      } else {
        newRules.push(
          CardRuleExtractor.process(element, input, fhir),
          OnlyRuleExtractor.process(element),
          AssignmentRuleExtractor.process(element),
          FlagRuleExtractor.process(element),
          BindingRuleExtractor.process(element)
        );
      }
      // NOTE: CaretValueExtractor for elements can only run once other Extractors have finished,
      // since it will convert any remaining fields to CaretValueRules
      newRules.push(...CaretValueRuleExtractor.process(element, fhir));
      target.rules = compact(newRules);
    }
  }

  static isProcessableStructureDefinition(input: any): input is ProcessableStructureDefinition {
    return input.name != null && input.resourceType != null;
  }
}

export interface ProcessableStructureDefinition {
  name: string;
  resourceType: string;
  id?: string;
  title?: string;
  description?: string;
  baseDefinition?: string;
  differential?: {
    element: any[];
  };
  snapshot?: {
    element: any[];
  };
}

interface ConstrainableEntity {
  name: string;
  id: string;
  title?: string;
  description?: string;
  rules?: ExportableSdRule[];
  parent?: string;
}
