import path from 'path';
import fs from 'fs-extra';
import { fhirtypes } from 'fsh-sushi';
import { CardRuleExtractor } from '../../src/rule-extractor';
import { ExportableCardRule } from '../../src/exportable';

describe('CardRuleExtractor', () => {
  let looseSD: any;

  beforeAll(() => {
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'card-profile.json'), 'utf-8').trim()
    );
  });

  it('should extract a card rule with a min and a max', () => {
    const element = fhirtypes.ElementDefinition.fromJSON(looseSD.differential.element[0]);
    const cardRule = CardRuleExtractor.process(element);
    const expectedRule = new ExportableCardRule('note');
    expectedRule.min = 1;
    expectedRule.max = '7';
    expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
  });

  it('should extract a card rule with only a min', () => {
    const element = fhirtypes.ElementDefinition.fromJSON(looseSD.differential.element[2]);
    const cardRule = CardRuleExtractor.process(element);
    const expectedRule = new ExportableCardRule('component');
    expectedRule.min = 3;
    expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
  });

  it('should extract a card rule with only a max', () => {
    const element = fhirtypes.ElementDefinition.fromJSON(looseSD.differential.element[3]);
    const cardRule = CardRuleExtractor.process(element);
    const expectedRule = new ExportableCardRule('category');
    expectedRule.max = '8';
    expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
  });

  it('should return a null when the element has no cardinality information', () => {
    const element = fhirtypes.ElementDefinition.fromJSON(looseSD.differential.element[1]);
    const cardRule = CardRuleExtractor.process(element);
    expect(cardRule).toBeNull();
  });
});
