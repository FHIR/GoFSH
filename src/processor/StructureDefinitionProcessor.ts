import compact from 'lodash/compact';
import { fhirtypes, utils, fshtypes } from 'fsh-sushi';
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
import { getAncestorSliceDefinition } from '../utils';
import { switchQuantityRules } from './common';

export class StructureDefinitionProcessor {
  static process(
    input: any,
    fisher: utils.Fishable,
    config: fshtypes.Configuration,
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
      const mappings = StructureDefinitionProcessor.extractMappings(elements, input, fisher);
      StructureDefinitionProcessor.extractRules(input, elements, sd, fisher, config);
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
    fisher: utils.Fishable,
    config: fshtypes.Configuration
  ): void {
    const newRules: ExportableSdRule[] = [];
    // First extract the top-level caret rules from the StructureDefinition
    newRules.push(...CaretValueRuleExtractor.processStructureDefinition(input, fisher, config));
    // Then extract rules based on the differential elements
    elements.forEach(element => {
      const ancestorSliceDefinition = getAncestorSliceDefinition(element, input, fisher);
      // if there is a slice, but no ancestor definition, capture with a contains rule
      if (element.sliceName && ancestorSliceDefinition == null) {
        newRules.push(
          ContainsRuleExtractor.process(element, input, fisher),
          OnlyRuleExtractor.process(element),
          ...AssignmentRuleExtractor.process(element),
          BindingRuleExtractor.process(element),
          ObeysRuleExtractor.process(element)
        );
      } else {
        newRules.push(
          CardRuleExtractor.process(element, input, fisher),
          OnlyRuleExtractor.process(element),
          ...AssignmentRuleExtractor.process(element),
          FlagRuleExtractor.process(element),
          BindingRuleExtractor.process(element),
          ObeysRuleExtractor.process(element)
        );
      }
      // if there is a slice, and there is an ancestor definition, don't process the sliceName again
      if (element.sliceName && ancestorSliceDefinition) {
        element.processedPaths.push('sliceName');
      }
      // NOTE: CaretValueExtractor for elements can only run once other Extractors have finished,
      // since it will convert any remaining fields to CaretValueRules
      newRules.push(...CaretValueRuleExtractor.process(element, fisher));
    });
    target.rules = compact(newRules);
    switchQuantityRules(target.rules);
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
    fisher: utils.Fishable
  ): ExportableMapping[] {
    return MappingExtractor.process(input, elements, fisher);
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
