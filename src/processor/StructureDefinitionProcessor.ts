import { capitalize, compact } from 'lodash';
import { fhirtypes, utils, fshtypes } from 'fsh-sushi';
import {
  ExportableSdRule,
  ExportableInvariant,
  ExportableMapping,
  ExportableProfile,
  ExportableExtension,
  ExportableLogical,
  ExportableResource,
  ExportableAddElementRule
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
  AddElementRuleExtractor,
  InvariantExtractor,
  MappingExtractor
} from '../extractor';
import { ProcessableElementDefinition, switchQuantityRules, makeNameSushiSafe } from '.';
import { getAncestorSliceDefinition, logger } from '../utils';

export class StructureDefinitionProcessor {
  static process(
    input: any,
    fisher: utils.Fishable,
    config: fshtypes.Configuration,
    existingInvariants: ExportableInvariant[] = []
  ):
    | [
        ExportableProfile | ExportableExtension | ExportableLogical | ExportableResource,
        ...(ExportableInvariant | ExportableMapping)[]
      ]
    | [] {
    if (StructureDefinitionProcessor.isProcessableStructureDefinition(input)) {
      let sd: ExportableProfile | ExportableExtension | ExportableLogical | ExportableResource;
      // Prefer name (which is required). If we happen to get invalid FHIR, create a reasonable name from the id with only allowable characters
      const name = input.name ?? input.id.split(/[-.]+/).map(capitalize).join('');
      if (input.kind === 'logical' && input.derivation === 'specialization') {
        sd = new ExportableLogical(name);
      } else if (input.kind === 'resource' && input.derivation === 'specialization') {
        sd = new ExportableResource(name);
      } else if (input.derivation === 'constraint' && input.type === 'Extension') {
        if (input.kind !== 'complex-type') {
          logger.error(
            `Extension "${name}" should have "kind" set to "complex-type" but has "${input.kind}" instead. The generated FSH will set "kind" to "complex-type".`
          );
          input.kind = 'complex-type';
        }
        sd = new ExportableExtension(name);
      } else if (input.derivation === 'constraint') {
        sd = new ExportableProfile(name);
      } else {
        // this should never be encountered when running normally, hopefully,
        // since the LakeOfFHIR should only be providing us with non-Instance StructureDefinitions
        throw new Error(
          'This StructureDefinition does not represent a FSH Profile, Extension, Logical, or Resource.'
        );
      }
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      StructureDefinitionProcessor.extractKeywords(input, sd);
      const invariants = StructureDefinitionProcessor.extractInvariants(
        input,
        elements,
        existingInvariants
      );
      const mappings = StructureDefinitionProcessor.extractMappings(elements, input, fisher);
      StructureDefinitionProcessor.extractRules(input, elements, sd, fisher, config);
      makeNameSushiSafe(sd);
      // TODO: Destructuring an array with invariants and mappings is required for TypeScript 3.0
      // With TypeScript 4.0, we should update to return the following line, which is more clear:
      // return [sd, ...invariants, ...mappings];
      return [sd, ...[...invariants, ...mappings]];
    }
    return [];
  }

  static extractKeywords(input: ProcessableStructureDefinition, target: ConstrainableEntity): void {
    // Name is already set (by constructor) based on input.name or input.id
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
    const newRules: (ExportableSdRule | ExportableAddElementRule)[] = [];
    let parentDefinition: ProcessableStructureDefinition;
    if (input.baseDefinition) {
      parentDefinition = fisher.fishForFHIR(input.baseDefinition);
    } else if (target instanceof ExportableResource) {
      parentDefinition = fisher.fishForFHIR(
        'http://hl7.org/fhir/StructureDefinition/DomainResource'
      );
    } else if (target instanceof ExportableLogical) {
      parentDefinition = fisher.fishForFHIR('http://hl7.org/fhir/StructureDefinition/Base');
    }
    // First extract the top-level caret rules from the StructureDefinition
    newRules.push(...CaretValueRuleExtractor.processStructureDefinition(input, fisher, config));
    // Then extract rules based on the differential elements
    elements.forEach(element => {
      const ancestorSliceDefinition = getAncestorSliceDefinition(element, input, fisher);
      // if there is a slice, which is not a choice slice, but no ancestor definition, it will need a contains rule
      const isNewSlice =
        element.sliceName &&
        !/\[x]:[a-z][a-z0-9]*[A-Z][A-Za-z0-9]*$/.test(element.id) &&
        ancestorSliceDefinition == null;
      if (
        (target instanceof ExportableResource || target instanceof ExportableLogical) &&
        !parentDefinition?.snapshot?.element?.some(parentEl => parentEl.id === element.id)
      ) {
        // a newly defined element on a Resource or Logical needs an AddElementRule
        // AddElementRule contains cardinality, flag, and type information, so those extractors don't need to be called here
        // the root element doesn't need to be added, but all other elements do.
        // but, we still want to mark paths as processed so that caret value rules are not made.

        if (isNewSlice) {
          logger.warn(
            `${target.constructorName} ${target.name} contains a slice definition for ${element.sliceName} on ${element.path}. This is not supported by FHIR.`
          );
          newRules.push(ContainsRuleExtractor.process(element, input, fisher));
        } else {
          if (element.path.indexOf('.') === -1) {
            // For the root element, mark the cardinality paths as processed
            // so that they don't get CaretValueRules created.
            element.processedPaths.push('min', 'max');
          } else {
            // For all other elements, make rules to add them.
            const addElementRules = AddElementRuleExtractor.process(element, input);
            newRules.push(...addElementRules);
          }
        }
        newRules.push(BindingRuleExtractor.process(element), ObeysRuleExtractor.process(element));
        const assignmentRules = AssignmentRuleExtractor.process(element);
        if (assignmentRules.length > 0) {
          logger.warn(
            `${target.constructorName} ${target.name} contains value assignment for ${element.id}. This is not supported by FHIR.`
          );
          newRules.push(...assignmentRules);
        }
      } else if (isNewSlice) {
        newRules.push(
          ContainsRuleExtractor.process(element, input, fisher),
          ...OnlyRuleExtractor.process(element),
          ...AssignmentRuleExtractor.process(element),
          BindingRuleExtractor.process(element),
          ObeysRuleExtractor.process(element)
        );
      } else {
        newRules.push(
          CardRuleExtractor.process(element, input, fisher),
          ...OnlyRuleExtractor.process(element),
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
      newRules.push(...CaretValueRuleExtractor.process(element, input, fisher));
    });
    target.rules = compact(newRules);
    switchQuantityRules(target.rules);
  }

  static extractInvariants(
    input: ProcessableStructureDefinition,
    elements: ProcessableElementDefinition[],
    existingInvariants: ExportableInvariant[]
  ): ExportableInvariant[] {
    const invariants: ExportableInvariant[] = [];
    elements.forEach(element => {
      invariants.push(
        ...InvariantExtractor.process(element, input, [...existingInvariants, ...invariants])
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
    return input.resourceType === 'StructureDefinition' && (input.name != null || input.id != null);
  }
}

export interface ProcessableStructureDefinition {
  name: string;
  resourceType: string;
  type?: string;
  id?: string;
  url?: string;
  title?: string;
  description?: string;
  baseDefinition?: string;
  kind?: string;
  derivation?: string;
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
  rules?: (ExportableSdRule | ExportableAddElementRule)[];
  parent?: string;
}
