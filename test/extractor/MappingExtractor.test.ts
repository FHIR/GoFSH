import path from 'path';
import fs from 'fs-extra';
import { fhirdefs } from 'fsh-sushi';
import { ProcessableElementDefinition, ProcessableStructureDefinition } from '../../src/processor';
import { MappingExtractor } from '../../src/extractor';
import { ExportableMapping, ExportableMappingRule } from '../../src/exportable';
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';

describe('MappingExtractor', () => {
  let looseSD: ProcessableStructureDefinition;
  let defs: fhirdefs.FHIRDefinitions;
  let elements: ProcessableElementDefinition[];

  beforeAll(() => {
    defs = loadTestDefinitions();
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'mapping-profile.json'), 'utf-8').trim()
    );
    elements = looseSD.differential.element.map(rawElement => {
      return ProcessableElementDefinition.fromJSON(rawElement, false);
    });
  });

  it('should extract mappings with rules from a single element', () => {
    const element = elements[2]; // Observation.focus
    const mappings = MappingExtractor.process(looseSD, elements, defs);
    const expectedMapping = new ExportableMapping('FirstMapping');
    expectedMapping.source = 'MyObservation';
    const mappingRule = new ExportableMappingRule('focus');
    mappingRule.map = 'Observation.otherFocus';
    expectedMapping.rules.push(mappingRule);

    expect(mappings).toHaveLength(4); // All mappings are created
    expect(mappings).toContainEqual(expectedMapping);

    expect(element.processedPaths).toContain('mapping[4].identity');
    expect(element.processedPaths).toContain('mapping[4].map');
  });

  it('should extract mappings with rules from multiple elements', () => {
    const catElement = elements[1]; // Observation.category
    const focusElement = elements[2]; // Observation.focus
    const mappings = MappingExtractor.process(looseSD, elements, defs);
    const expectedMapping = new ExportableMapping('FirstMapping');
    expectedMapping.source = 'MyObservation';
    const mappingRule = new ExportableMappingRule('focus');
    mappingRule.map = 'Observation.otherFocus';
    expectedMapping.rules.push(mappingRule);

    expect(mappings).toHaveLength(4); // All mappings are created
    expect(mappings).toContainEqual(expectedMapping);

    expect(catElement.processedPaths).toContain('mapping[0].identity');
    expect(catElement.processedPaths).toContain('mapping[0].map');
    expect(catElement.processedPaths).toContain('mapping[0].comment');
    expect(catElement.processedPaths).toContain('mapping[0].language');
    expect(focusElement.processedPaths).toContain('mapping[4].identity');
    expect(focusElement.processedPaths).toContain('mapping[4].map');
    expect(focusElement.processedPaths).toContain('mapping[5].identity');
    expect(focusElement.processedPaths).toContain('mapping[5].map');
    expect(focusElement.processedPaths).toContain('mapping[5].comment');
    expect(focusElement.processedPaths).toContain('mapping[5].language');
  });

  it('should extract mappings with rules from the top level element', () => {
    const element = elements[0]; // Observation
    const mappings = MappingExtractor.process(looseSD, elements, defs);
    const expectedMapping = new ExportableMapping('TopLevelMapping');
    expectedMapping.source = 'MyObservation';
    const mappingRule = new ExportableMappingRule('');
    mappingRule.map = 'Observation';
    expectedMapping.rules.push(mappingRule);

    expect(mappings).toHaveLength(4); // All mappings are created
    expect(mappings).toContainEqual(expectedMapping);

    expect(element.processedPaths).toContain('mapping[4].identity');
    expect(element.processedPaths).toContain('mapping[4].map');
  });

  it('should not extract mappings that do not exist on the top level structure definition', () => {
    const element = elements[3]; // Observation.status
    const mappings = MappingExtractor.process(looseSD, elements, defs);
    const unexpectedMapping = new ExportableMapping('RogueMapping');
    unexpectedMapping.source = 'MyObservation';
    const mappingRule = new ExportableMappingRule('status');
    mappingRule.map = 'Observation.notReal';
    unexpectedMapping.rules.push(mappingRule);

    expect(mappings).toHaveLength(4); // Only the four mappings in the SD mapping list are created
    expect(mappings).not.toContainEqual(unexpectedMapping); // No RogueMapping made

    expect(element.processedPaths).toHaveLength(0); // No paths marked as processed on element
  });

  it('should not extract unchanged mappings that exist on the parent', () => {
    const mappings = MappingExtractor.process(looseSD, elements, defs);
    expect(mappings).toHaveLength(4); // Only new mappings are created
  });

  it('should extract mappings that exist on the parent but have additional rules applied', () => {
    const element = elements[4]; // Observation.note
    const mappings = MappingExtractor.process(looseSD, elements, defs);

    // sct-concept is a mapping on all observations, but has a new mapping rule applied on this profile
    const expectedMapping = new ExportableMapping('sct-concept');
    expectedMapping.source = 'MyObservation';
    expectedMapping.title = 'SNOMED CT Concept Domain Binding';
    expectedMapping.target = 'http://snomed.info/conceptdomain';
    const mappingRule = new ExportableMappingRule('note');
    mappingRule.map = 'Observation.newNote';
    expectedMapping.rules.push(mappingRule);

    const sctConceptMapping = mappings.find(m => m.name === 'sct-concept');

    expect(mappings).toHaveLength(4); // All mappings are created
    expect(sctConceptMapping).toBeDefined();
    expect(sctConceptMapping.rules).toEqual([mappingRule]); // Only has new rule, not inherited rules

    expect(element.processedPaths).toContain('mapping[0].identity');
    expect(element.processedPaths).toContain('mapping[0].map');
  });
});
