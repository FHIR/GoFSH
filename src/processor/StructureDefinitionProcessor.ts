import compact from 'lodash/compact';
import { fhirdefs, fhirtypes } from 'fsh-sushi';
import {
  ExportableSdRule,
  ExportableInvariant,
  ExportableMapping,
  ExportableProfile,
  ExportableExtension
} from '../exportable';
import {
  CardRuleExtractor,
  CaretValueRuleExtractor,
  AssignmentRuleExtractor,
  FlagRuleExtractor,
  BindingRuleExtractor,
  ContainsRuleExtractor,
  OnlyRuleExtractor,
  ObeysRuleExtractor,
  InvariantExtractor,
  MappingExtractor
} from '../extractor';
import { ProcessableElementDefinition } from '.';
import { getAncestorElement } from '../utils';

export class StructureDefinitionProcessor {
  static process(
    input: any,
    fhir: fhirdefs.FHIRDefinitions,
    existingInvariants: ExportableInvariant[] = []
  ):
    | [ExportableProfile | ExportableExtension, ...(ExportableInvariant | ExportableMapping)[]]
    | [] {
    if (StructureDefinitionProcessor.isProcessableStructureDefinition(input)) {
      let sd: ExportableProfile | ExportableExtension;
      if (input.type === 'Extension') {
        sd = new ExportableExtension(input.name);
      } else {
        sd = new ExportableProfile(input.name);
      }
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      StructureDefinitionProcessor.extractKeywords(input, sd);
      const invariants = StructureDefinitionProcessor.extractInvariants(
        elements,
        existingInvariants
      );
      const mappings = StructureDefinitionProcessor.extractMappings(elements, input, fhir);
      StructureDefinitionProcessor.extractRules(input, elements, sd, fhir);
      // TODO: Destructuring an array with invariants and mappings is required for TypeScript 3.0
      // With TypeScript 4.0, we should update to return the following line, which is more clear:
      // return [sd, ...invariants, ...mappings];
      return [sd, ...[...invariants, ...mappings]];
    }
    return [];
  }

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
          AssignmentRuleExtractor.process(element),
          BindingRuleExtractor.process(element),
          ObeysRuleExtractor.process(element)
        );
      } else {
        newRules.push(
          CardRuleExtractor.process(element, input, fhir),
          OnlyRuleExtractor.process(element),
          AssignmentRuleExtractor.process(element),
          FlagRuleExtractor.process(element),
          BindingRuleExtractor.process(element),
          ObeysRuleExtractor.process(element)
        );
      }
      // NOTE: CaretValueExtractor for elements can only run once other Extractors have finished,
      // since it will convert any remaining fields to CaretValueRules
      newRules.push(...CaretValueRuleExtractor.process(element, fhir));
    });
    target.rules = compact(newRules);
  }

  static extractInvariants(
    elements: ProcessableElementDefinition[],
    existingInvariants: ExportableInvariant[]
  ): ExportableInvariant[] {
    const invariants: ExportableInvariant[] = [];
    elements.forEach(element => {
      invariants.push(
        ...InvariantExtractor.process(element, [...existingInvariants, ...invariants])
      );
    });
    return invariants;
  }

  static extractMappings(
    elements: ProcessableElementDefinition[],
    input: ProcessableStructureDefinition,
    fhir: fhirdefs.FHIRDefinitions
  ): ExportableMapping[] {
    return MappingExtractor.process(input, elements, fhir);
  }

  static isProcessableStructureDefinition(input: any): input is ProcessableStructureDefinition {
    return input.name != null && input.resourceType != null;
  }
}

export interface ProcessableStructureDefinition {
  name: string;
  resourceType: string;
  type?: string;
  id?: string;
  title?: string;
  description?: string;
  baseDefinition?: string;
  mapping?: fhirtypes.StructureDefinitionMapping[];
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
