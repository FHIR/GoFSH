import { fhirtypes } from 'fsh-sushi';
import { ExportableInstance } from '../exportable';

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

  static process(input: any, implementationGuide: any): ExportableInstance {
    const instance = new ExportableInstance(input.id);
    InstanceProcessor.extractKeywords(input, instance, implementationGuide);
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
