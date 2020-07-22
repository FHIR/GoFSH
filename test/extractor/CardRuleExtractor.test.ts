import path from 'path';
import fs from 'fs-extra';
import { ElementDefinition } from 'fsh-sushi/dist/fhirtypes';
import { CardRuleExtractor } from '../../src/rule-extractor';
import { CardRule } from 'fsh-sushi/dist/fshtypes/rules';

describe('CardRuleExtractor', () => {
  let extractor: CardRuleExtractor;
  let looseSD: any;

  beforeAll(() => {
    extractor = new CardRuleExtractor();
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'card-profile.json'), 'utf-8').trim()
    );
  });

  it('should extract a card rule with a min and a max', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[0]);
    const cardRule = extractor.process(element);
    const expectedRule = new CardRule('note');
    expectedRule.min = 1;
    expectedRule.max = '7';
    expect(cardRule).toEqual<CardRule>(expectedRule);
  });

  it('should extract a card rule with only a min', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[2]);
    const cardRule = extractor.process(element);
    const expectedRule = new CardRule('component');
    expectedRule.min = 3;
    expect(cardRule).toEqual<CardRule>(expectedRule);
  });

  it('should extract a card rule with only a max', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[3]);
    const cardRule = extractor.process(element);
    const expectedRule = new CardRule('category');
    expectedRule.max = '8';
    expect(cardRule).toEqual<CardRule>(expectedRule);
  });

  it('should return a null when the element has no cardinality information', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[1]);
    const cardRule = extractor.process(element);
    expect(cardRule).toBeNull();
  });
});
