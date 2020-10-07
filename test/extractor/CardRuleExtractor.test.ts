import path from 'path';
import fs from 'fs-extra';
import { CardRuleExtractor } from '../../src/extractor';
import { ExportableCardRule } from '../../src/exportable';
import { ProcessableElementDefinition } from '../../src/processor';

describe('CardRuleExtractor', () => {
  let looseSD: any;

  beforeAll(() => {
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'card-profile.json'), 'utf-8').trim()
    );
  });
  describe('#process', () => {
    it('should extract a card rule with a min and a max', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
      const cardRule = CardRuleExtractor.process(element);
      const expectedRule = new ExportableCardRule('note');
      expectedRule.min = 1;
      expectedRule.max = '7';
      expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
      expect(element.processedPaths).toEqual(['min', 'max']);
    });

    it('should extract a card rule with only a min', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
      const cardRule = CardRuleExtractor.process(element);
      const expectedRule = new ExportableCardRule('component');
      expectedRule.min = 3;
      expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
      expect(element.processedPaths).toEqual(['min']);
    });

    it('should extract a card rule with only a max', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]);
      const cardRule = CardRuleExtractor.process(element);
      const expectedRule = new ExportableCardRule('category');
      expectedRule.max = '8';
      expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
      expect(element.processedPaths).toEqual(['max']);
    });

    it('should return a null when the element has no cardinality information', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
      const cardRule = CardRuleExtractor.process(element);
      expect(cardRule).toBeNull();
      expect(element.processedPaths).toEqual([]);
    });
  });
});
