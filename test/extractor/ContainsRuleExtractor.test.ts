import path from 'path';
import fs from 'fs-extra';
import { ContainsRuleExtractor } from '../../src/extractor';
import { ProcessableElementDefinition } from '../../src/processor';
import {
  ExportableContainsRule,
  ExportableCardRule,
  ExportableFlagRule
} from '../../src/exportable';
import { FHIRDefinitions } from '../../src/utils';
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';
import { loggerSpy } from '../helpers/loggerSpy';

describe('ContainsRuleExtractor', () => {
  let looseSD: any;
  let defs: FHIRDefinitions;

  beforeAll(() => {
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'contains-profile.json'), 'utf-8').trim()
    );
    defs = loadTestDefinitions();
  });

  it('should extract a ContainsRule with cardinality', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
    const containsRule = ContainsRuleExtractor.process(element, looseSD, defs);
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
    const containsRule = ContainsRuleExtractor.process(element, looseSD, defs);
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

  it('should use default cardinality on a ContainsRule when cardinality information is not available', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[7]);
    const containsRule = ContainsRuleExtractor.process(element, looseSD, defs);
    const expectedRule = new ExportableContainsRule('extension');
    expectedRule.items.push({ name: 'Rutabega' });
    const cardRule = new ExportableCardRule('extension[Rutabega]');
    cardRule.min = 0;
    cardRule.max = '100';
    expectedRule.cardRules.push(cardRule);
    expect(containsRule).toEqual<ExportableContainsRule>(expectedRule);
  });

  it('should extract a ContainsRule with a sliceName that does not match its id', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[9]);
    const containsRule = ContainsRuleExtractor.process(element, looseSD, defs);
    const expectedRule = new ExportableContainsRule('extension');
    expectedRule.items.push({
      name: 'Nectarines'
    });
    const cardRule = new ExportableCardRule('extension[Nectarines]');
    cardRule.min = 1;
    cardRule.max = '4';
    expectedRule.cardRules.push(cardRule);
    expect(containsRule).toEqual<ExportableContainsRule>(expectedRule);
    expect(element.processedPaths).toEqual(['min', 'max', 'sliceName']);
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /StructureDefinition ObservationWithContains.*id \(Observation.extension:Nectarines\).*sliceName \(Plums\).*sliceName "Nectarines"/
    );
  });

  it('should return null when no cardinality information can be found for the sliced element', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[8]);
    expect(ContainsRuleExtractor.process(element, looseSD, defs)).toBeNull();
  });

  it('should use cardinality information on the snapshot when the information is not present on the differential', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[10]);
    const containsRule = ContainsRuleExtractor.process(element, looseSD, defs);
    const expectedRule = new ExportableContainsRule('extension');
    expectedRule.items.push({ name: 'Pomelo' });
    const cardRule = new ExportableCardRule('extension[Pomelo]');
    cardRule.min = 0; // no min on differential or snapshot, so use default slice min
    cardRule.max = '3'; // max available on snapshot
    expectedRule.cardRules.push(cardRule);
    expect(containsRule).toEqual<ExportableContainsRule>(expectedRule);
  });

  it.todo('should extract a ContainsRule with cardinality and a name');

  it.todo('should extract a ContainsRule with cardinality, flags, and a name');
});
