import path from 'path';
import fs from 'fs-extra';
import { fshtypes } from 'fsh-sushi';
import { ProcessableElementDefinition } from '../../src/processor';
import { ObeysRuleExtractor } from '../../src/rule-extractor';
import { ExportableObeysRule, ExportableInvariant } from '../../src/exportable';

describe('ObeysRuleExtractor', () => {
  let looseSD: any;

  beforeAll(() => {
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'obeys-profile.json'), 'utf-8').trim()
    );
  });

  it('should extract an obeys rule and an invariant on an element with one constraint', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
    const { obeysRule, invariants } = ObeysRuleExtractor.process(element);
    const expectedRule = new ExportableObeysRule('.');
    expectedRule.keys = ['zig-1'];
    const expectedInvariant = new ExportableInvariant('zig-1');
    expectedInvariant.severity = new fshtypes.FshCode('warning');
    expectedInvariant.description = 'This is a constraint on the root element.';

    expect(obeysRule).toEqual<ExportableObeysRule>(expectedRule);
    expect(invariants).toHaveLength(1);
    expect(invariants).toContainEqual<ExportableInvariant>(expectedInvariant);
  });

  it('should extract an obeys rule and multiple invariants on an element with multiple constraints', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
    const { obeysRule, invariants } = ObeysRuleExtractor.process(element);
    const expectedRule = new ExportableObeysRule('category');
    expectedRule.keys = ['zig-2', 'zig-3'];
    const expectedExpressionInvariant = new ExportableInvariant('zig-2');
    expectedExpressionInvariant.severity = new fshtypes.FshCode('error');
    expectedExpressionInvariant.description = 'This constraint has an expression.';
    expectedExpressionInvariant.expression = 'category.exists()';
    const expectedXpathInvariant = new ExportableInvariant('zig-3');
    expectedXpathInvariant.severity = new fshtypes.FshCode('warning');
    expectedXpathInvariant.description = 'This constraint has an xpath.';
    expectedXpathInvariant.xpath = 'f:category';

    expect(obeysRule).toEqual<ExportableObeysRule>(expectedRule);
    expect(invariants).toHaveLength(2);
    expect(invariants).toContainEqual<ExportableInvariant>(expectedExpressionInvariant);
    expect(invariants).toContainEqual<ExportableInvariant>(expectedXpathInvariant);
  });

  it('should not extract an obeys rule nor invariants on an element with no constraints', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
    const { obeysRule, invariants } = ObeysRuleExtractor.process(element);

    expect(obeysRule).toBeNull();
    expect(invariants).toHaveLength(0);
  });
});
