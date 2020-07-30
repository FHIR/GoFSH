import path from 'path';
import fs from 'fs-extra';
import { ElementDefinition } from 'fsh-sushi/dist/fhirtypes';
import { ValueSetRuleExtractor } from '../../src/rule-extractor';
import { ValueSetRule } from 'fsh-sushi/dist/fshtypes/rules';

describe('ValueSetRuleExtractor', () => {
  let extractor: ValueSetRuleExtractor;
  let looseSD: any;

  beforeAll(() => {
    extractor = new ValueSetRuleExtractor();
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'valueSet-profile.json'), 'utf-8').trim()
    );
  });

  it('should extract a valueSet rule with a valueSet and a strength', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[0]);
    const valueSetRule = extractor.process(element);
    const expectedRule = new ValueSetRule('valueCodeableConcept');
    expectedRule.valueSet = 'http://example.org/ValueSet/Foo';
    expectedRule.strength = 'required';
    expect(valueSetRule).toEqual<ValueSetRule>(expectedRule);
  });

  it('should return null when the element has a strength and no valueSet', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[1]);
    const valueSetRule = extractor.process(element);
    expect(valueSetRule).toBeNull();
  });

  it('should return null when the element has no binding', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[2]);
    const valueSetRule = extractor.process(element);
    expect(valueSetRule).toBeNull();
  });
});
