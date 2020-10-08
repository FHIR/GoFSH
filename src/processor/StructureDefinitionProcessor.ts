import compact from 'lodash/compact';
import { fhirdefs } from 'fsh-sushi';
import { ExportableSdRule, ExportableInvariant } from '../exportable';
import {
  CardRuleExtractor,
  CaretValueRuleExtractor,
  FixedValueRuleExtractor,
  FlagRuleExtractor,
  ValueSetRuleExtractor,
  ContainsRuleExtractor,
  OnlyRuleExtractor,
  ObeysRuleExtractor,
  InvariantExtractor
} from '../extractor';
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
    elements: ProcessableElementDefinition[],
    target: ConstrainableEntity,
    fhir: fhirdefs.FHIRDefinitions
  ): void {
    const newRules: ExportableSdRule[] = [];
    // First extract the top-level caret rules from the StructureDefinition
    newRules.push(...CaretValueRuleExtractor.processStructureDefinition(input, fhir));
    // Then extract rules based on the differential elements
    elements.forEach(element => {
      if (element.sliceName && getAncestorElement(element.id, input, fhir) == null) {
        newRules.push(
          ContainsRuleExtractor.process(element, input, fhir),
          OnlyRuleExtractor.process(element),
          FixedValueRuleExtractor.process(element),
          ValueSetRuleExtractor.process(element),
          ObeysRuleExtractor.process(element)
        );
      } else {
        newRules.push(
          CardRuleExtractor.process(element),
          OnlyRuleExtractor.process(element),
          FixedValueRuleExtractor.process(element),
          FlagRuleExtractor.process(element),
          ValueSetRuleExtractor.process(element),
          ObeysRuleExtractor.process(element)
        );
      }
      // NOTE: CaretValueExtractor for elements can only run once other Extractors have finished,
      // since it will convert any remaining fields to CaretValueRules
      newRules.push(...CaretValueRuleExtractor.process(element, fhir));
    });
    target.rules = compact(newRules);
  }

  static extractInvariants(elements: ProcessableElementDefinition[]): ExportableInvariant[] {
    const invariants: ExportableInvariant[] = [];
    elements.forEach(element => {
      invariants.push(...InvariantExtractor.process(element));
    });
    return invariants;
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
