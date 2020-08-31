import compact from 'lodash/compact';
import { fhirdefs } from 'fsh-sushi';
import { ExportableSdRule } from '../exportable';
import {
  CardRuleExtractor,
  CaretValueRuleExtractor,
  FixedValueRuleExtractor,
  FlagRuleExtractor,
  ValueSetRuleExtractor,
  ContainsRuleExtractor,
  OnlyRuleExtractor
} from '../rule-extractor';
import { ProcessableElementDefinition } from '.';

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
    for (const rawElement of input?.differential?.element ?? []) {
      const element = ProcessableElementDefinition.fromJSON(rawElement, false);
      if (element.sliceName) {
        newRules.push(
          ContainsRuleExtractor.process(element),
          OnlyRuleExtractor.process(element),
          FixedValueRuleExtractor.process(element),
          ValueSetRuleExtractor.process(element)
        );
      } else {
        newRules.push(
          CardRuleExtractor.process(element),
          OnlyRuleExtractor.process(element),
          FixedValueRuleExtractor.process(element),
          FlagRuleExtractor.process(element),
          ValueSetRuleExtractor.process(element)
        );
      }
      // NOTE: CaretValueExtractor can only run once other Extractors have finished, since
      // it will convert any remaining fields to CaretValueRules
      newRules.push(...CaretValueRuleExtractor.process(element, fhir));
      target.rules = compact(newRules);
    }
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
