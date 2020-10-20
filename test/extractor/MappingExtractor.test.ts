import path from 'path';
import fs from 'fs-extra';
import { ProcessableElementDefinition } from '../../src/processor';
import { MappingExtractor } from '../../src/extractor';
import { ExportableMapping, ExportableMappingRule } from '../../src/exportable';
import { fhirdefs } from 'fsh-sushi';

describe('InvariantExtractor', () => {
  let looseSD: any;
  let defs: fhirdefs.FHIRDefinitions;

  beforeAll(() => {
    defs = new fhirdefs.FHIRDefinitions();
    fhirdefs.loadFromPath(path.join(__dirname, '..', 'utils', 'testdefs'), 'testPackage', defs);
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'mapping-profile.json'), 'utf-8').trim()
    );
  });

  it('should extract mappings with rules from a single element', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]); // Observation.focus
    const mappings = MappingExtractor.process(looseSD, [element], defs);
    const expectedMapping = new ExportableMapping('FirstMapping');
    expectedMapping.source = 'MyObservation';
    const mappingRule = new ExportableMappingRule('focus');
    mappingRule.map = 'Observation.otherFocus';
    expectedMapping.rules.push(mappingRule);

    expect(mappings).toHaveLength(3); // All mappings are created
    expect(mappings).toContainEqual(expectedMapping);

    expect(element.processedPaths).toContain('mapping[0].identity');
    expect(element.processedPaths).toContain('mapping[0].map');
  });

  it('should extract mappings with rules from multiple elements', () => {
    const catElement = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]); // Observation.category
    const focusElement = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]); // Observation.focus
    const mappings = MappingExtractor.process(looseSD, [catElement, focusElement], defs);
    const expectedMapping = new ExportableMapping('FirstMapping');
    expectedMapping.source = 'MyObservation';
    const mappingRule = new ExportableMappingRule('focus');
    mappingRule.map = 'Observation.otherFocus';
    expectedMapping.rules.push(mappingRule);

    expect(mappings).toHaveLength(3); // All mappings are created
    expect(mappings).toContainEqual(expectedMapping);

    expect(catElement.processedPaths).toContain('mapping[0].identity');
    expect(catElement.processedPaths).toContain('mapping[0].map');
    expect(catElement.processedPaths).toContain('mapping[0].comment');
    expect(catElement.processedPaths).toContain('mapping[0].language');
    expect(catElement.processedPaths).toContain('mapping[0].identity');
    expect(catElement.processedPaths).toContain('mapping[0].map');
    expect(catElement.processedPaths).toContain('mapping[0].comment');
    expect(catElement.processedPaths).toContain('mapping[0].language');
    expect(focusElement.processedPaths).toContain('mapping[1].identity');
    expect(focusElement.processedPaths).toContain('mapping[1].map');
  });

  it('should extract mappings with rules from the top level element', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]); // Observation
    const mappings = MappingExtractor.process(looseSD, [element], defs);
    const expectedMapping = new ExportableMapping('TopLevelMapping');
    expectedMapping.source = 'MyObservation';
    const mappingRule = new ExportableMappingRule('');
    mappingRule.map = 'Observation';
    expectedMapping.rules.push(mappingRule);

    expect(mappings).toHaveLength(3); // All mappings are created
    expect(mappings).toContainEqual(expectedMapping);

    expect(element.processedPaths).toContain('mapping[0].identity');
    expect(element.processedPaths).toContain('mapping[0].map');
  });

  it('should not extract mappings that do not exist on the top level structure definition', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]); // Observation.status
    const mappings = MappingExtractor.process(looseSD, [element], defs);
    const unexpectedMapping = new ExportableMapping('RogueMapping');
    unexpectedMapping.source = 'MyObservation';
    const mappingRule = new ExportableMappingRule('status');
    mappingRule.map = 'Observation.notReal';
    unexpectedMapping.rules.push(mappingRule);

    expect(mappings).toHaveLength(3); // Only the three mappings in the SD mapping list are created
    expect(mappings).not.toContainEqual(unexpectedMapping); // No RogueMapping made

    expect(element.processedPaths).toHaveLength(0); // No paths marked as processed on element
  });
});
