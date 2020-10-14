import path from 'path';
import fs from 'fs-extra';
import { fshrules } from 'fsh-sushi';
import { BindingRuleExtractor } from '../../src/extractor';
import { ProcessableElementDefinition } from '../../src/processor';

describe('BindingRuleExtractor', () => {
  let looseSD: any;

  beforeAll(() => {
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'binding-profile.json'), 'utf-8').trim()
    );
  });

  it('should extract a BindingRule with a valueSet and a strength', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
    const bindingRule = BindingRuleExtractor.process(element);
    const expectedRule = new fshrules.BindingRule('valueCodeableConcept');
    expectedRule.valueSet = 'http://example.org/ValueSet/Foo';
    expectedRule.strength = 'required';
    expect(bindingRule).toEqual<fshrules.BindingRule>(expectedRule);
    expect(element.processedPaths).toEqual(['binding.valueSet', 'binding.strength']);
  });

  it('should return null when the element has a strength and no valueSet', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
    const bindingRule = BindingRuleExtractor.process(element);
    expect(bindingRule).toBeNull();
    expect(element.processedPaths).toEqual([]);
  });

  it('should return null when the element has no binding', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
    const bindingRule = BindingRuleExtractor.process(element);
    expect(bindingRule).toBeNull();
    expect(element.processedPaths).toEqual([]);
  });
});
