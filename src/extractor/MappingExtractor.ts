import { fhirdefs, fhirtypes, fshtypes, utils } from 'fsh-sushi';
import { difference, isEqual, pullAt } from 'lodash';
import { ExportableMapping, ExportableMappingRule } from '../exportable';
import { ProcessableElementDefinition, ProcessableStructureDefinition } from '../processor';
import { getPath } from '../utils';

export class MappingExtractor {
  static process(
    input: ProcessableStructureDefinition,
    elements: ProcessableElementDefinition[],
    fhir: fhirdefs.FHIRDefinitions
  ): ExportableMapping[] {
    const mappings = (input.mapping || []).map(m => {
      const mapping = new ExportableMapping(m.identity);
      mapping.source = input.name;
      if (m.name) mapping.title = m.name;
      if (m.uri) mapping.target = m.uri;
      if (m.comment) mapping.description = m.comment;
      return mapping;
    });
    elements.forEach(element => {
      this.extractRules(element, mappings);
    });

    // Filter out mappings on the parent - only include mappings new to the profile
    // or mappings on the base definition with additional mapping rules
    // TODO: Look for parents from the local package being processed. This requires a MasterFisher.
    const parent = fhir.fishForFHIR(
      input.baseDefinition,
      utils.Type.Resource,
      utils.Type.Type,
      utils.Type.Profile,
      utils.Type.Extension
    );

    // If there is no parent found, all the mappings should be exported.
    if (parent == null) return mappings;

    const parentSD = fhirtypes.StructureDefinition.fromJSON(parent);
    const inheritedMappings = mappings.filter(m =>
      parent.mapping.some((pm: fhirtypes.StructureDefinitionMapping) => pm.identity === m.name)
    );
    const newMappings = difference(mappings, inheritedMappings);

    // For each inherited mapping, look to see if there are any new rules
    const changedInheritedMappings = inheritedMappings.filter(mapping => {
      const changedIndexes: number[] = [];
      mapping.rules.forEach((rule, i) => {
        const element = parentSD.findElementByPath(rule.path, fhir);
        // See if any mapping on the element matches the current rule we are looking for
        // If one matches, this is not a new rule. If none match, this is new to the profile.
        const elementMappingRules = (element?.mapping || [])?.map((m, i) =>
          this.processMappingRule(ProcessableElementDefinition.fromJSON(element), m, i)
        );
        if (elementMappingRules.find(r => isEqual(r, rule))) {
          // Remove inherited rules so we don't include them if the mapping is exported
          changedIndexes.push(i);
        }
      });
      pullAt(mapping.rules, changedIndexes);
      return mapping.rules.length > 0;
    });
    return [...newMappings, ...changedInheritedMappings];
  }

  static extractRules(element: ProcessableElementDefinition, mappings: ExportableMapping[]) {
    element.mapping?.forEach((mapping, i) => {
      // Mappings are created at SD, so should always find a match at this point
      const matchingMapping = mappings.find(m => m.name === mapping.identity);
      matchingMapping?.rules.push(this.processMappingRule(element, mapping, i));
    });
  }

  static processMappingRule(
    element: ProcessableElementDefinition,
    mapping: fhirtypes.ElementDefinitionMapping,
    i: number
  ): ExportableMappingRule {
    let path = getPath(element);
    if (path === '.') path = ''; // Root path in mappings is an empty string

    const mappingRule = new ExportableMappingRule(path);
    mappingRule.map = mapping.map;
    element.processedPaths.push(`mapping[${i}].identity`);
    element.processedPaths.push(`mapping[${i}].map`);

    if (mapping.comment) {
      mappingRule.comment = mapping.comment;
      element.processedPaths.push(`mapping[${i}].comment`);
    }
    if (mapping.language) {
      mappingRule.language = new fshtypes.FshCode(mapping.language);
      element.processedPaths.push(`mapping[${i}].language`);
    }
    return mappingRule;
  }
}