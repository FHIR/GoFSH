import path from 'path';
import fs from 'fs-extra';
import { ContainsRuleExtractor } from '../../src/rule-extractor';
import { ProcessableElementDefinition } from '../../src/processor';
import {
  ExportableContainsRule,
  ExportableCardRule,
  ExportableFlagRule
} from '../../src/exportable';

describe('ContainsRuleExtractor', () => {
  let looseSD: any;

  beforeAll(() => {
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'contains-profile.json'), 'utf-8').trim()
    );
  });

  it('should extract a ContainsRule with cardinality', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
    const containsRule = ContainsRuleExtractor.process(element);
    const expectedRule = new ExportableContainsRule('extension');
    expectedRule.items.push({
      name: 'Oranges'
    });
    const cardRule = new ExportableCardRule('extension[Oranges]');
    cardRule.min = 1;
    cardRule.max = '4';
    expectedRule.cardRules.push(cardRule);
    expect(containsRule).toEqual<ExportableContainsRule>(expectedRule);
    expect(element.processedPaths).toEqual(['min', 'max', 'sliceName']);
  });

  it('should extract a ContainsRule with cardinality and flags', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]);
    const containsRule = ContainsRuleExtractor.process(element);
    const expectedRule = new ExportableContainsRule('extension');
    expectedRule.items.push({
      name: 'Apples'
    });
    const cardRule = new ExportableCardRule('extension[Apples]');
    cardRule.min = 0;
    cardRule.max = '1';
    expectedRule.cardRules.push(cardRule);
    const flagRule = new ExportableFlagRule('extension[Apples]');
    flagRule.mustSupport = true;
    expectedRule.flagRules.push(flagRule);
    expect(containsRule).toEqual<ExportableContainsRule>(expectedRule);
    expect(element.processedPaths).toEqual(['min', 'max', 'mustSupport', 'sliceName']);
  });

  it('should not extract a ContainsRule when no cardinality is on the element', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[7]);
    const containsRule = ContainsRuleExtractor.process(element);
    expect(containsRule).toBeNull();
    expect(element.processedPaths).toEqual([]);
  });

  it.todo('should extract a ContainsRule with cardinality and a name');

  it.todo('should extract a ContainsRule with cardinality, flags, and a name');
});
