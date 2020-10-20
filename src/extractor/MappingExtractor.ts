import { fhirdefs, fshtypes, utils } from 'fsh-sushi';
import { differenceWith, isEqual } from 'lodash';
import { ExportableMapping, ExportableMappingRule } from '../exportable';
import { ProcessableElementDefinition, ProcessableStructureDefinition } from '../processor';
import { getPath } from '../utils';

export class MappingExtractor {
  static process(
    input: ProcessableStructureDefinition,
    elements: ProcessableElementDefinition[],
    fhir: fhirdefs.FHIRDefinitions
  ): ExportableMapping[] {
    const mappings =
      input.mapping?.map(m => {
        const mapping = new ExportableMapping(m.identity);
        mapping.source = input.name;
        if (m.name) mapping.title = m.name;
        if (m.uri) mapping.target = m.uri;
        if (m.comment) mapping.description = m.comment;
        return mapping;
      }) ?? [];
    elements.forEach(element => {
      this.extractRules(element, mappings);
    });

    // Filter out mappings on the parent - only include mappings new to the profile
    const parent = fhir.fishForFHIR(
      input.baseDefinition,
      utils.Type.Resource,
      utils.Type.Type,
      utils.Type.Profile,
      utils.Type.Extension
    );
    const newItems = differenceWith(input.mapping, parent?.mapping, isEqual);
    const newMappings = mappings.filter(mapping => newItems.some(i => i.identity === mapping.name));
    return newMappings;
  }

  static extractRules(element: ProcessableElementDefinition, mappings: ExportableMapping[]) {
    element.mapping?.forEach((mapping, i) => {
      // Mappings are created at SD, so should always find a match at this point
      const matchingMapping = mappings.find(m => m.name === mapping.identity);
      if (!matchingMapping) return;
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
      matchingMapping.rules.push(mappingRule);
    });
  }
}
