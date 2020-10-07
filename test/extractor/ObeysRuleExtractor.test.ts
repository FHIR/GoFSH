import path from 'path';
import fs from 'fs-extra';
import { ProcessableElementDefinition } from '../../src/processor';
import { ObeysRuleExtractor } from '../../src/extractor';
import { ExportableObeysRule } from '../../src/exportable';

describe('ObeysRuleExtractor', () => {
  let looseSD: any;

  beforeAll(() => {
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'obeys-profile.json'), 'utf-8').trim()
    );
  });

  it('should extract an obeys rule and an invariant on an element with one constraint', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
    const obeysRule = ObeysRuleExtractor.process(element);
    const expectedRule = new ExportableObeysRule('.');
    expectedRule.keys = ['zig-1'];

    expect(obeysRule).toEqual<ExportableObeysRule>(expectedRule);
    expect(element.processedPaths).toHaveLength(5);
    expect(element.processedPaths).toContainEqual('constraint[0].key');
    expect(element.processedPaths).toContainEqual('constraint[0].human');
    expect(element.processedPaths).toContainEqual('constraint[0].severity');
    expect(element.processedPaths).toContainEqual('constraint[0].expression');
    expect(element.processedPaths).toContainEqual('constraint[0].xpath');
  });

  it('should extract an obeys rule and multiple invariants on an element with multiple constraints', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
    const obeysRule = ObeysRuleExtractor.process(element);
    const expectedRule = new ExportableObeysRule('category');
    expectedRule.keys = ['zig-2', 'zig-3', 'zig-4'];

    expect(obeysRule).toEqual<ExportableObeysRule>(expectedRule);
    expect(element.processedPaths).toHaveLength(15);
    expect(element.processedPaths).toContainEqual('constraint[0].key');
    expect(element.processedPaths).toContainEqual('constraint[0].human');
    expect(element.processedPaths).toContainEqual('constraint[0].severity');
    expect(element.processedPaths).toContainEqual('constraint[0].expression');
    expect(element.processedPaths).toContainEqual('constraint[0].xpath');
    expect(element.processedPaths).toContainEqual('constraint[1].key');
    expect(element.processedPaths).toContainEqual('constraint[1].human');
    expect(element.processedPaths).toContainEqual('constraint[1].severity');
    expect(element.processedPaths).toContainEqual('constraint[1].expression');
    expect(element.processedPaths).toContainEqual('constraint[1].xpath');
    expect(element.processedPaths).toContainEqual('constraint[2].key');
    expect(element.processedPaths).toContainEqual('constraint[2].human');
    expect(element.processedPaths).toContainEqual('constraint[2].severity');
    expect(element.processedPaths).toContainEqual('constraint[2].expression');
    expect(element.processedPaths).toContainEqual('constraint[2].xpath');
  });

  it('should not extract an obeys rule nor invariants on an element with no constraints', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
    const obeysRule = ObeysRuleExtractor.process(element);

    expect(obeysRule).toBeNull();
  });
});
