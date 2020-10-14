import path from 'path';
import fs from 'fs-extra';
import { ProcessableElementDefinition } from '../../src/processor';
import { InvariantExtractor } from '../../src/extractor';
import { ExportableInvariant } from '../../src/exportable';
import { fshtypes } from 'fsh-sushi';
const { FshCode } = fshtypes;

describe('InvariantExtractor', () => {
  let looseSD: any;

  beforeAll(() => {
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'obeys-profile.json'), 'utf-8').trim()
    );
  });

  it('should extract invariants from an element with one constraint', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
    const invariants = InvariantExtractor.process(element, []);
    const rootInvariant = new ExportableInvariant('zig-1');
    rootInvariant.severity = new FshCode('warning');
    rootInvariant.description = 'This is a constraint on the root element.';

    expect(invariants).toHaveLength(1);
    expect(invariants).toContainEqual(rootInvariant);
    expect(element.processedPaths).toContain('constraint[0].key');
    expect(element.processedPaths).toContain('constraint[0].severity');
    expect(element.processedPaths).toContain('constraint[0].human');
  });

  it('should extract invariants from an element with multiple constraints', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
    const invariants = InvariantExtractor.process(element, []);
    const expressionInvariant = new ExportableInvariant('zig-2');
    expressionInvariant.severity = new FshCode('error');
    expressionInvariant.description = 'This constraint has an expression.';
    expressionInvariant.expression = 'category.exists()';
    const xpathInvariant = new ExportableInvariant('zig-3');
    xpathInvariant.severity = new FshCode('warning');
    xpathInvariant.description = 'This constraint has an xpath.';
    xpathInvariant.xpath = 'f:category';
    const bothInvariant = new ExportableInvariant('zig-4');
    bothInvariant.severity = new FshCode('warning');
    bothInvariant.description = 'This constraint has an expression and an xpath.';
    bothInvariant.expression = 'category.double.exists()';
    bothInvariant.xpath = 'f:category/double';

    expect(invariants).toHaveLength(3);
    expect(invariants).toContainEqual(expressionInvariant);
    expect(invariants).toContainEqual(xpathInvariant);
    expect(invariants).toContainEqual(bothInvariant);
    expect(element.processedPaths).toContain('constraint[0].key');
    expect(element.processedPaths).toContain('constraint[0].severity');
    expect(element.processedPaths).toContain('constraint[0].human');
    expect(element.processedPaths).toContain('constraint[0].expression');
    expect(element.processedPaths).toContain('constraint[1].key');
    expect(element.processedPaths).toContain('constraint[1].severity');
    expect(element.processedPaths).toContain('constraint[1].human');
    expect(element.processedPaths).toContain('constraint[1].xpath');
    expect(element.processedPaths).toContain('constraint[2].key');
    expect(element.processedPaths).toContain('constraint[2].severity');
    expect(element.processedPaths).toContain('constraint[2].human');
    expect(element.processedPaths).toContain('constraint[2].expression');
    expect(element.processedPaths).toContain('constraint[2].xpath');
  });

  it('should extract no invariants from an element with no constraints', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
    const invariants = InvariantExtractor.process(element, []);
    expect(invariants).toHaveLength(0);
    expect(element.processedPaths).toHaveLength(0);
  });

  it('should not extract an invariant and should process paths if an equal invariant already exists', () => {
    const existingInvariant = new ExportableInvariant('zig-1');
    existingInvariant.severity = new FshCode('warning');
    existingInvariant.description = 'This is a constraint on the root element.';
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
    const invariants = InvariantExtractor.process(element, [existingInvariant]);
    expect(invariants).toHaveLength(0);
    expect(element.processedPaths).toHaveLength(3);
    expect(element.processedPaths).toContainEqual('constraint[0].key');
    expect(element.processedPaths).toContainEqual('constraint[0].severity');
    expect(element.processedPaths).toContainEqual('constraint[0].human');
  });

  it('should not extract an invariant nor process paths if a non-equal invariant with a matching key already exists', () => {
    const existingInvariant = new ExportableInvariant('zig-1');
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
    const invariants = InvariantExtractor.process(element, [existingInvariant]);
    expect(invariants).toHaveLength(0);
    expect(element.processedPaths).toHaveLength(0);
  });
});
