import { fshtypes } from 'fsh-sushi';
import { ExportableMapping, ExportableMappingRule } from '../exportable';
import { ProcessableElementDefinition } from '../processor';
import { getPath } from '../utils';

export class MappingExtractor {
  static process(
    element: ProcessableElementDefinition,
    mappings: ExportableMapping[]
  ): ExportableMapping[] {
    element.mapping?.forEach((mapping, i) => {
      // Mappings are created at SD, so should always find a match at this point
      const matchingMapping = mappings.find(m => m.name === mapping.identity);
      if (!matchingMapping) return;
      let path = getPath(element);
      if (path === '.') path = ''; // Root path in mappings is an empty string
      const mappingRule = new ExportableMappingRule(path);
      mappingRule.map = mapping.map;
      if (mapping.comment) mappingRule.comment = mapping.comment;
      if (mapping.language) mappingRule.language = new fshtypes.FshCode(mapping.language);
      matchingMapping.rules.push(mappingRule);

      // Mark mapping related paths as processed
      element.processedPaths.push(`mapping[${i}].identity`);
      element.processedPaths.push(`mapping[${i}].map`);
      element.processedPaths.push(`mapping[${i}].comment`);
      element.processedPaths.push(`mapping[${i}].language`);
    });
    return mappings;
  }
}
