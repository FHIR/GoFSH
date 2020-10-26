import { fhirdefs, fhirtypes, fshtypes, utils } from 'fsh-sushi';
import { isEqual, pullAt } from 'lodash';
import { ExportableMapping, ExportableMappingRule } from '../exportable';
import {
  ProcessableElementDefinition,
  ProcessableStructureDefinition,
  StructureDefinitionProcessor
} from '../processor';
import { getPath } from '../utils';

export class MappingExtractor {
  static process(
    input: ProcessableStructureDefinition,
    elements: ProcessableElementDefinition[],
    fhir: fhirdefs.FHIRDefinitions
  ): ExportableMapping[] {
    const mappings = this.extractMappings(input, elements);

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
    if (parent == null || !StructureDefinitionProcessor.isProcessableStructureDefinition(parent))
      return mappings;

    const parentSDElements =
      parent.snapshot?.element?.map(rawElement => {
        return ProcessableElementDefinition.fromJSON(rawElement, false);
      }) ?? [];

    const parentMappings = this.extractMappings(parent, parentSDElements);

    // Filter out any mappings that come directly from the parent SD.
    // Only return mappings that are new to the profile or inherited mappings that include new MappingRules
    const newMappings = mappings.filter(mapping => {
      const changedIndexes: number[] = [];
      const parentMapping = parentMappings.find(pm => pm.name === mapping.name);
      // If the mapping does not match any from the parent SD, it is new to the profile.
      if (parentMapping == null) return true;

      // Check if each mapping rule is new to the profile
      mapping.rules.forEach((rule, i) => {
        // If it matches one on the parent SD, it is not a new rule. If it doesn't match, this is new to the profile.
        if (parentMapping.rules.find(r => isEqual(r, rule))) {
          // Remove inherited rules so we don't include them if the mapping is exported
          changedIndexes.push(i);
        }
      });
      pullAt(mapping.rules, changedIndexes);
      return mapping.rules.length > 0;
    });
    return newMappings;
  }

  static extractMappings(
    sd: ProcessableStructureDefinition,
    elements: ProcessableElementDefinition[]
  ): ExportableMapping[] {
    const mappings = (sd.mapping || []).map(m => {
      const mapping = new ExportableMapping(m.identity);
      mapping.source = sd.name;
      if (m.name) mapping.title = m.name;
      if (m.uri) mapping.target = m.uri;
      if (m.comment) mapping.description = m.comment;
      return mapping;
    });
    elements.forEach(element => {
      this.extractRules(element, mappings);
    });
    return mappings;
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
