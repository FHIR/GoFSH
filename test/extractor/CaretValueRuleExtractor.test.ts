import path from 'path';
import fs from 'fs-extra';
import { fhirdefs, fshtypes } from 'fsh-sushi';
import { CaretValueRuleExtractor } from '../../src/rule-extractor';
import { ExportableCaretValueRule } from '../../src/exportable';
import { ProcessableElementDefinition } from '../../src/processor';

describe('CaretValueRuleExtractor', () => {
  let looseSD: any;
  let defs: fhirdefs.FHIRDefinitions;

  beforeAll(() => {
    defs = new fhirdefs.FHIRDefinitions();
    fhirdefs.loadFromPath(path.join(__dirname, '..', 'utils', 'testdefs'), 'testPackage', defs);
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'caret-value-profile.json'), 'utf-8').trim()
    );
  });

  it('should extract a single top-level caret value rule', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
    const caretRules = CaretValueRuleExtractor.process(element, defs);
    const expectedRule = new ExportableCaretValueRule('identifier');
    expectedRule.caretPath = 'short';
    expectedRule.value = 'foo';
    expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule]);
  });

  it('should extract multiple top-level caret value rules', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
    const caretRules = CaretValueRuleExtractor.process(element, defs);
    const expectedRule1 = new ExportableCaretValueRule('basedOn');
    expectedRule1.caretPath = 'short';
    expectedRule1.value = 'foo';
    const expectedRule2 = new ExportableCaretValueRule('basedOn');
    expectedRule2.caretPath = 'definition';
    expectedRule2.value = 'bar';
    expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule1, expectedRule2]);
  });

  it('should extract a single nested path caret value rule', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
    const caretRules = CaretValueRuleExtractor.process(element, defs);
    const expectedRule = new ExportableCaretValueRule('partOf');
    expectedRule.caretPath = 'base.path';
    expectedRule.value = 'foo';
    expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule]);
  });

  it('should extract multiple nested path caret value rules', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]);
    const caretRules = CaretValueRuleExtractor.process(element, defs);
    const expectedRule1 = new ExportableCaretValueRule('status');
    expectedRule1.caretPath = 'base.path';
    expectedRule1.value = 'foo';
    const expectedRule2 = new ExportableCaretValueRule('status');
    expectedRule2.caretPath = 'base.min';
    expectedRule2.value = 0;
    const expectedRule3 = new ExportableCaretValueRule('status');
    expectedRule3.caretPath = 'slicing.discriminator.type';
    expectedRule3.value = new fshtypes.FshCode('value');
    expect(caretRules).toHaveLength(3);
    expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule1);
    expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule2);
    expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule3);
  });

  it('should extract array caret value rules', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[4]);
    const caretRules = CaretValueRuleExtractor.process(element, defs);
    const expectedRule1 = new ExportableCaretValueRule('category');
    expectedRule1.caretPath = 'alias[0]';
    expectedRule1.value = 'foo';
    const expectedRule2 = new ExportableCaretValueRule('category');
    expectedRule2.caretPath = 'alias[1]';
    expectedRule2.value = 'bar';
    expect(caretRules).toHaveLength(2);
    expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule1);
    expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule2);
  });

  it('should extract array caret value rules with children', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[5]);
    const caretRules = CaretValueRuleExtractor.process(element, defs);
    const expectedRule1 = new ExportableCaretValueRule('code');
    expectedRule1.caretPath = 'code[0].system';
    expectedRule1.value = 'http://foo.com';
    const expectedRule2 = new ExportableCaretValueRule('code');
    expectedRule2.caretPath = 'code[1].version';
    expectedRule2.value = '1.2.3';
    expect(caretRules).toHaveLength(2);
    expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule1);
    expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule2);
  });

  it('should convert a FHIR code string to a FSH code when extracting', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[8]);
    const caretRules = CaretValueRuleExtractor.process(element, defs);
    const expectedRule = new ExportableCaretValueRule('dataAbsentReason.coding.code');
    expectedRule.caretPath = 'fixedCode';
    expectedRule.value = new fshtypes.FshCode('foo');
    expect(caretRules).toHaveLength(1);
    expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule);
  });

  it('should return no rules when the element only has id and path', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[6]);
    const caretRules = CaretValueRuleExtractor.process(element, defs);
    expect(caretRules).toEqual([]);
  });

  it('should ignore previously processed paths', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[7]);
    element.processedPaths = [
      'min',
      'type[0].code',
      'type[1].code',
      'type[1].targetProfile[0]',
      'type[1].targetProfile[1]'
    ];

    const caretRules = CaretValueRuleExtractor.process(element, defs);
    const expectedRule1 = new ExportableCaretValueRule('focus');
    expectedRule1.caretPath = 'short';
    expectedRule1.value = 'foo';
    const expectedRule2 = new ExportableCaretValueRule('focus');
    expectedRule2.caretPath = 'type[1].versioning';
    expectedRule2.value = new fshtypes.FshCode('specific');
    expect(caretRules).toHaveLength(2);
    expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule1);
    expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule2);
  });
});
