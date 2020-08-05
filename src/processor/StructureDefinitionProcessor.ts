import compact from 'lodash/compact';
import { fhirtypes } from 'fsh-sushi';
import { ExportableSdRule } from '../exportable';
import {
  CardRuleExtractor,
  FixedValueRuleExtractor,
  FlagRuleExtractor,
  ValueSetRuleExtractor
} from '../rule-extractor';

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

  static extractRules(input: ProcessableStructureDefinition, target: ConstrainableEntity): void {
    const newRules: ExportableSdRule[] = [];
    for (const rawElement of input?.differential?.element ?? []) {
      const element = fhirtypes.ElementDefinition.fromJSON(rawElement, false);
      newRules.push(
        CardRuleExtractor.process(element),
        FixedValueRuleExtractor.process(element),
        FlagRuleExtractor.process(element),
        ValueSetRuleExtractor.process(element)
      );
    }
    target.rules = compact(newRules);
  }

  static isProcessableStructureDefinition(input: any): input is ProcessableStructureDefinition {
    return input.name != null && input.resourceType != null;
  }
}

interface ProcessableStructureDefinition {
  name: string;
  resourceType: string;
  id?: string;
  title?: string;
  description?: string;
  baseDefinition?: string;
  differential?: {
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
