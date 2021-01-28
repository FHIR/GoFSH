import { cloneDeep, compact, isEmpty } from 'lodash';
import { fhirtypes, utils } from 'fsh-sushi';
import { ExportableAssignmentRule, ExportableInstance } from '../exportable';
import { removeUnderscoreForPrimitiveChildPath } from '../exportable/common';
import { getFSHValue, getPathValuePairs, logger } from '../utils';
import { switchQuantityRules } from '.';

export class InstanceProcessor {
  static extractKeywords(input: any, target: ExportableInstance, implementationGuide: any): void {
    target.instanceOf = input.meta?.profile?.[0] ?? input.resourceType;
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

  static extractRules(input: any, target: ExportableInstance, fisher: utils.Fishable): void {
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
      if (input.meta?.profile?.[0]) {
        logger.warn(
          `InstanceOf definition not found for ${input.id}. The ResourceType of the instance will be used as a base.`
        );
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
    }

    IGNORED_PROPERTIES.forEach(prop => {
      delete inputJSON[prop];
    });
    // First profile will be used in InstanceOf keyword if present
    inputJSON.meta?.profile?.splice(0, 1);
    if (inputJSON.meta?.profile?.length === 0) {
      delete inputJSON.meta?.profile;
      if (isEmpty(inputJSON.meta)) {
        delete inputJSON.meta;
      }
    }
    if (inputJSON.text?.status === 'generated') {
      delete inputJSON.text;
    }

    const flatInstance = getPathValuePairs(inputJSON);
    Object.keys(flatInstance).forEach(key => {
      // Remove any _ at the start of any path part
      const path = removeUnderscoreForPrimitiveChildPath(key);
      const assignmentRule = new ExportableAssignmentRule(path);
      assignmentRule.value = getFSHValue(key, flatInstance, instanceOfJSON.type, fisher);
      newRules.push(assignmentRule);
    });
    target.rules = compact(newRules);
    switchQuantityRules(target.rules);
  }

  static process(input: any, implementationGuide: any, fisher: utils.Fishable): ExportableInstance {
    const instance = new ExportableInstance(input.id);
    InstanceProcessor.extractKeywords(input, instance, implementationGuide);
    InstanceProcessor.extractRules(input, instance, fisher);
    return instance;
  }
}

// List of Conformance and Terminology resources from http://hl7.org/fhir/R4/resourcelist.html
const CONFORMANCE_AND_TERMINOLOGY_RESOURCES = new Set([
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
