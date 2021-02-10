import { fhirtypes, fshtypes, utils } from 'fsh-sushi';
import { isEqual } from 'lodash';
import { ExportableMapping, ExportableMappingRule } from '../exportable';
import {
  ProcessableElementDefinition,
  ProcessableStructureDefinition,
  StructureDefinitionProcessor
} from '../processor';
import { getPath, logger } from '../utils';

export class MappingExtractor {
  static process(
    input: ProcessableStructureDefinition,
    elements: ProcessableElementDefinition[],
    fisher: utils.Fishable
  ): ExportableMapping[] {
    const mappings = this.extractMappings(input, elements);

    // Filter out mappings on the parent - only include mappings new to the profile
    // or mappings on the base definition with additional mapping rules
    // TODO: Look for parents from the local package being processed. This requires a MasterFisher.
    const parent = fisher.fishForFHIR(
      input.baseDefinition,
      utils.Type.Resource,
      utils.Type.Type,
      utils.Type.Profile,
      utils.Type.Extension
    );

    // If there is no parent found, all the mappings should be exported.
    if (parent == null || !StructureDefinitionProcessor.isProcessableStructureDefinition(parent)) {
      return mappings;
    }

    const parentSDElements =
      parent.snapshot?.element?.map(rawElement => {
        return ProcessableElementDefinition.fromJSON(rawElement, false);
      }) ?? [];

    const parentMappings = this.extractMappings(parent, parentSDElements, true);

    // Only return mappings that are new to the profile or inherited mappings with new MappingRules
    const newMappings: ExportableMapping[] = [];
    mappings.forEach(mapping => {
      const parentMapping = parentMappings.find(pm => pm.id === mapping.id);
      // filter rules to include only those not in a parent
      mapping.rules = mapping.rules.filter(
        rule => !parentMapping?.rules.find(r => isEqual(r, rule))
      );
      // if there wasn't a parent at all or if there are new rules not in the parent, it's new
      if (parentMapping == null || mapping.rules.length > 0) {
        newMappings.push(mapping);
      }
    });
    return newMappings;
  }

  static extractMappings(
    sd: ProcessableStructureDefinition,
    elements: ProcessableElementDefinition[],
    processingParent = false
  ): ExportableMapping[] {
    const mappings = (sd.mapping || []).map(m => {
      const mapping = new ExportableMapping(`${m.identity}-for-${sd.name}`);
      mapping.id = m.identity;
      mapping.source = sd.name;
      mapping.name = `${mapping.id}-for-${mapping.source}`;
      if (m.name) mapping.title = m.name;
      if (m.uri) mapping.target = m.uri;
      if (m.comment) mapping.description = m.comment;
      return mapping;
    });
    elements.forEach(element => {
      this.extractRules(element, sd, mappings, processingParent);
    });
    return mappings;
  }

  static extractRules(
    element: ProcessableElementDefinition,
    sd: ProcessableStructureDefinition,
    mappings: ExportableMapping[],
    processingParent = false
  ) {
    element.mapping?.forEach((mapping, i) => {
      let matchingMapping = mappings.find(m => m.id === mapping.identity);
      if (matchingMapping == null) {
        // There should always be a matching mapping, but some IGs seem to be missing some top-level mappings
        // (I'm looking at you US Core 3.1.1).  When a mapping is missing, create one on the fly, but log
        // a warning and write a comment.
        matchingMapping = new ExportableMapping(`${mapping.identity}-for-${sd.name}`);
        matchingMapping.id = mapping.identity;
        matchingMapping.source = sd.name;
        if (!processingParent) {
          matchingMapping.fshComment =
            `WARNING: The following Mapping may be incomplete since the original ${sd.name}\n` +
            `StructureDefinition was missing the mapping entry for ${matchingMapping.id}.\n` +
            'Please review this and add the following properties as necessary: Target, Title, Description';
          logger.warn(
            `Element in ${sd.name} references undefined SD-level mapping: ${matchingMapping.id}.  GoFSH has created a new Mapping named ` +
              `${matchingMapping.name}. Please review and edit the Mapping in your FSH files to provide additional information.`
          );
        }
        mappings.push(matchingMapping);
      }
      matchingMapping.rules.push(this.processMappingRule(element, mapping, i));
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
