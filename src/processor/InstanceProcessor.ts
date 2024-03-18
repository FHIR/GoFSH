import { cloneDeep, compact, isEmpty, toPairs } from 'lodash';
import { fhirtypes, utils } from 'fsh-sushi';
import { ExportableAssignmentRule, ExportableInstance } from '../exportable';
import {
  getFSHValue,
  isFSHValueEmpty,
  getPathValuePairs,
  logger,
  ProcessingOptions
} from '../utils';
import { switchQuantityRules } from '.';

export class InstanceProcessor {
  static extractKeywords(
    input: any,
    target: ExportableInstance,
    implementationGuide: any,
    options: ProcessingOptions = {}
  ): void {
    if (options.metaProfile === 'first') {
      target.instanceOf =
        input.meta?.profile?.length > 0 ? input.meta.profile[0] : input.resourceType;
    } else if (options.metaProfile === 'none') {
      target.instanceOf = input.resourceType;
    } else {
      target.instanceOf =
        input.meta?.profile?.length === 1 ? input.meta.profile[0] : input.resourceType;
    }

    const resource: fhirtypes.ImplementationGuideDefinitionResource = implementationGuide?.definition?.resource?.find(
      (resource: fhirtypes.ImplementationGuideDefinitionResource) =>
        resource.reference?.reference === `${input.resourceType}/${input.id}`
    );
    target.name = `${target.name}-of-${target.instanceOf}`;
    if (resource) {
      if (resource.name) {
        target.title = resource.name;
      }
      if (resource.description) {
        target.description = resource.description;
      }
      target.usage =
        resource.exampleBoolean || resource.exampleCanonical ? 'Example' : 'Definition';
    } else {
      target.usage = CONFORMANCE_AND_TERMINOLOGY_RESOURCES.has(input.resourceType)
        ? 'Definition'
        : 'Example';
    }
  }

  static extractRules(
    input: any,
    target: ExportableInstance,
    fisher: utils.Fishable,
    options: ProcessingOptions
  ): void {
    const newRules: ExportableInstance['rules'] = [];
    // Clone input so it can be modified
    const inputJSON = cloneDeep(input);
    let instanceOfJSON = fisher.fishForFHIR(
      target.instanceOf,
      utils.Type.Resource,
      utils.Type.Profile,
      utils.Type.Extension,
      utils.Type.Type
    );

    if (instanceOfJSON == null) {
      if (input.meta?.profile?.length > 0) {
        logger.warn(
          `InstanceOf definition not found for ${input.id}. The ResourceType of the instance will be used as a base.`
        );
        target.instanceOf = input.resourceType;
      }
      instanceOfJSON = fisher.fishForFHIR(
        input.resourceType,
        utils.Type.Resource,
        utils.Type.Profile,
        utils.Type.Extension,
        utils.Type.Type
      );
      if (instanceOfJSON == null) {
        logger.error(
          `Definition of ResourceType not found for ${input.id}. Cannot export any Assignment Rules`
        );
        return;
      }
    } else if (
      (inputJSON.meta?.profile?.length === 1 && options.metaProfile !== 'none') ||
      (inputJSON.meta?.profile?.length > 0 && options.metaProfile === 'first')
    ) {
      // If we found JSON for the profile, delete it from meta.profile.
      inputJSON.meta.profile.splice(0, 1);
      if (isEmpty(inputJSON.meta.profile)) {
        delete inputJSON.meta.profile;
      }

      if (isEmpty(inputJSON.meta)) {
        delete inputJSON.meta;
      }
    }

    IGNORED_PROPERTIES.forEach(prop => {
      delete inputJSON[prop];
    });
    if (inputJSON.text?.status === 'generated') {
      delete inputJSON.text;
    }

    const flatInstanceArray = toPairs(getPathValuePairs(inputJSON));
    flatInstanceArray.forEach(([path], i) => {
      const assignmentRule = new ExportableAssignmentRule(path);
      assignmentRule.value = getFSHValue(
        i,
        flatInstanceArray,
        instanceOfJSON.type,
        target.name,
        fisher
      );
      // if the value is empty, we can't use that
      if (isFSHValueEmpty(assignmentRule.value)) {
        logger.error(
          `Value in Instance ${target.name} at path ${path} is empty. No assignment rule will be created.`
        );
      } else {
        newRules.push(assignmentRule);
      }
    });
    target.rules = compact(newRules);
    switchQuantityRules(target.rules);
  }

  static process(
    input: any,
    implementationGuide: any,
    fisher: utils.Fishable,
    options: ProcessingOptions = {}
  ): ExportableInstance {
    const instance = new ExportableInstance(input.id);
    InstanceProcessor.extractKeywords(input, instance, implementationGuide, options);
    InstanceProcessor.extractRules(input, instance, fisher, options);
    return instance;
  }
}

// List of Conformance and Terminology resources from http://hl7.org/fhir/R4/resourcelist.html
export const CONFORMANCE_AND_TERMINOLOGY_RESOURCES = new Set([
  'CapabilityStatement',
  'StructureDefinition',
  'ImplementationGuide',
  'SearchParameter',
  'MessageDefinition',
  'OperationDefinition',
  'CompartmentDefinition',
  'StructureMap',
  'GraphDefinition',
  'ExampleScenario',
  'CodeSystem',
  'ValueSet',
  'ConceptMap',
  'NamingSystem',
  'TerminologyCapabilities'
]);

// The properties that are handled via keywords
const IGNORED_PROPERTIES = ['resourceType', 'id'];
