import path from 'path';
import fs from 'fs-extra';
import { fhirtypes, fshrules } from 'fsh-sushi';
import { ValueSetRuleExtractor } from '../../src/rule-extractor';

describe('ValueSetRuleExtractor', () => {
  let looseSD: any;

  beforeAll(() => {
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'valueSet-profile.json'), 'utf-8').trim()
    );
  });

  it('should extract a valueSet rule with a valueSet and a strength', () => {
    const element = fhirtypes.ElementDefinition.fromJSON(looseSD.differential.element[0]);
    const valueSetRule = ValueSetRuleExtractor.process(element);
    const expectedRule = new fshrules.ValueSetRule('valueCodeableConcept');
    expectedRule.valueSet = 'http://example.org/ValueSet/Foo';
    expectedRule.strength = 'required';
    expect(valueSetRule).toEqual<fshrules.ValueSetRule>(expectedRule);
  });

  it('should return null when the element has a strength and no valueSet', () => {
    const element = fhirtypes.ElementDefinition.fromJSON(looseSD.differential.element[1]);
    const valueSetRule = ValueSetRuleExtractor.process(element);
    expect(valueSetRule).toBeNull();
  });

  it('should return null when the element has no binding', () => {
    const element = fhirtypes.ElementDefinition.fromJSON(looseSD.differential.element[2]);
    const valueSetRule = ValueSetRuleExtractor.process(element);
    expect(valueSetRule).toBeNull();
  });
});
