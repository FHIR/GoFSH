import { cloneDeep, compact, isEqual } from 'lodash';
import { fhirtypes, utils } from 'fsh-sushi';
import { ExportableAssignmentRule, ExportableInstance } from '../exportable';
import { getFSHValue, getPathValuePairs, logger } from '../utils';

export class InstanceProcessor {
  static extractKeywords(input: any, target: ExportableInstance, implementationGuide: any): void {
    target.instanceOf = input.meta?.profile?.[0] ?? input.resourceType;
    const resource: fhirtypes.ImplementationGuideDefinitionResource = implementationGuide?.definition?.resource?.find(
      (resource: fhirtypes.ImplementationGuideDefinitionResource) =>
        resource.reference?.reference === `${input.resourceType}/${input.id}`
    );
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
    if (inputJSON.text?.status === 'generated') {
      delete inputJSON.text;
    }

    const flatInstance = getPathValuePairs(inputJSON);
    const flatInstanceOf = getPathValuePairs(instanceOfJSON);
    Object.keys(flatInstance).forEach(key => {
      if (flatInstanceOf[key] == null || !isEqual(flatInstance[key], flatInstanceOf[key])) {
        const assignmentRule = new ExportableAssignmentRule(key);
        assignmentRule.value = getFSHValue(key, flatInstance[key], instanceOfJSON.type, fisher);
        newRules.push(assignmentRule);
      }
    });
    target.rules = compact(newRules);
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
const IGNORED_PROPERTIES = ['resourceType', 'id', 'meta'];
