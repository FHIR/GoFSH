import path from 'path';
import fs from 'fs-extra';
import { FixedValueRuleExtractor } from '../../src/rule-extractor';
import { ExportableFixedValueRule } from '../../src/exportable';
import { ProcessableElementDefinition } from '../../src/processor';

describe('FixedValueRuleExtractor', () => {
  let looseSD: any;

  beforeAll(() => {
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'fixed-value-profile.json'), 'utf-8').trim()
    );
  });

  it('should extract a fixed value rule with a fixed number value', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
    const fixedValueRule = FixedValueRuleExtractor.process(element);
    const expectedRule = new ExportableFixedValueRule('valueInteger');
    expectedRule.fixedValue = 0;
    expectedRule.exactly = true;
    expect(fixedValueRule).toEqual<ExportableFixedValueRule>(expectedRule);
    expect(element.processedPaths).toEqual(['fixedInteger']);
  });

  it('should extract a fixed value rule with a pattern number value', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
    const fixedValueRule = FixedValueRuleExtractor.process(element);
    const expectedRule = new ExportableFixedValueRule('component.valueInteger');
    expectedRule.fixedValue = 8;
    expect(fixedValueRule).toEqual<ExportableFixedValueRule>(expectedRule);
    expect(element.processedPaths).toEqual(['patternInteger']);
  });

  it('should extract a fixed value rule with a fixed string value', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
    const fixedValueRule = FixedValueRuleExtractor.process(element);
    const expectedRule = new ExportableFixedValueRule('effectiveInstant');
    expectedRule.fixedValue = '2020-07-24T9:31:23.745-04:00';
    expectedRule.exactly = true;
    expect(fixedValueRule).toEqual<ExportableFixedValueRule>(expectedRule);
    expect(element.processedPaths).toEqual(['fixedInstant']);
  });

  it('should extract a fixed value rule with a pattern string value', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]);
    const fixedValueRule = FixedValueRuleExtractor.process(element);
    const expectedRule = new ExportableFixedValueRule('note.text');
    expectedRule.fixedValue = 'This is the note text';
    expect(fixedValueRule).toEqual<ExportableFixedValueRule>(expectedRule);
    expect(element.processedPaths).toEqual(['patternString']);
  });

  it('should extract a fixed value rule with a fixed boolean value', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[4]);
    const fixedValueRule = FixedValueRuleExtractor.process(element);
    const expectedRule = new ExportableFixedValueRule('valueBoolean');
    expectedRule.fixedValue = true;
    expectedRule.exactly = true;
    expect(fixedValueRule).toEqual<ExportableFixedValueRule>(expectedRule);
    expect(element.processedPaths).toEqual(['fixedBoolean']);
  });

  it('should extract a fixed value rule with a pattern boolean value', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[5]);
    const fixedValueRule = FixedValueRuleExtractor.process(element);
    const expectedRule = new ExportableFixedValueRule('component.valueBoolean');
    expectedRule.fixedValue = false;
    expect(fixedValueRule).toEqual<ExportableFixedValueRule>(expectedRule);
    expect(element.processedPaths).toEqual(['patternBoolean']);
  });

  it('should return null when an element does not have a fixed or pattern value', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[6]);
    const fixedValueRule = FixedValueRuleExtractor.process(element);
    expect(fixedValueRule).toBeNull();
    expect(element.processedPaths).toEqual([]);
  });
});
