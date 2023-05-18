import path from 'path';
import fs from 'fs-extra';
import { OnlyRuleExtractor } from '../../src/extractor';
import { ExportableOnlyRule } from '../../src/exportable';
import { ProcessableElementDefinition } from '../../src/processor';

describe('OnlyRuleExtractor', () => {
  let looseSD: any;
  let sdWithCodeableReference: any;

  beforeAll(() => {
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'only-profile.json'), 'utf-8').trim()
    );
    sdWithCodeableReference = JSON.parse(
      fs
        .readFileSync(
          path.join(__dirname, 'fixtures', 'only-profile-with-codeablereference.json'),
          'utf-8'
        )
        .trim()
    );
  });

  it('should extract an only rule with a subset of a choice type', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
    const onlyRules = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('effective[x]');
    expectedRule.types = [{ type: 'dateTime' }, { type: 'Period' }];
    expect(onlyRules).toHaveLength(1);
    expect(onlyRules[0]).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual(['type[0].code', 'type[1].code']);
  });

  it('should extract an only rule with profiles of a type', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
    const onlyRules = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('value[x]');
    expectedRule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/SimpleQuantity' },
      { type: 'http://hl7.org/fhir/StructureDefinition/MoneyQuantity' }
    ];
    expect(onlyRules).toHaveLength(1);
    expect(onlyRules[0]).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual([
      'type[0].profile[0]',
      'type[0].profile[1]',
      'type[0].code'
    ]);
  });

  it('should extract an only rule with a subset of a Reference type', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
    const onlyRules = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('hasMember');
    expectedRule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/Observation', isReference: true },
      { type: 'http://hl7.org/fhir/StructureDefinition/MolecularSequence', isReference: true }
    ];
    expect(onlyRules).toHaveLength(1);
    expect(onlyRules[0]).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual([
      'type[0].targetProfile[0]',
      'type[0].targetProfile[1]',
      'type[0].code'
    ]);
  });

  it('should extract an only rule with a profile on a Reference', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]);
    const onlyRules = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('extension[foo].value[x]');
    expectedRule.types = [
      { type: 'string' },
      { type: 'http://hl7.org/fhir/StructureDefinition/ProfileOfReference' }
    ];
    expect(onlyRules).toHaveLength(1);
    expect(onlyRules[0]).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual(['type[0].code', 'type[1].profile[0]', 'type[1].code']);
  });

  it('should extract an only rule with a subset of a CodeableReference type', () => {
    const element = ProcessableElementDefinition.fromJSON(
      sdWithCodeableReference.differential.element[0]
    );
    const onlyRules = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('activity.performedActivity');
    expectedRule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/Observation', isReference: true },
      { type: 'http://hl7.org/fhir/StructureDefinition/MolecularSequence', isReference: true }
    ];
    expect(onlyRules).toHaveLength(1);
    expect(onlyRules[0]).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual([
      'type[0].targetProfile[0]',
      'type[0].targetProfile[1]',
      'type[0].code'
    ]);
  });

  it('should extract an only rule with a profile on a CodeableReference', () => {
    const element = ProcessableElementDefinition.fromJSON(
      sdWithCodeableReference.differential.element[1]
    );
    const onlyRules = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('extension[foo].value[x]');
    expectedRule.types = [
      { type: 'string' },
      { type: 'http://hl7.org/fhir/StructureDefinition/ProfileOfCodeableReference' }
    ];
    expect(onlyRules).toHaveLength(1);
    expect(onlyRules[0]).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual(['type[0].code', 'type[1].profile[0]', 'type[1].code']);
  });

  it('should extract only rules on an element with both Reference and CodeableReference types', () => {
    const element = ProcessableElementDefinition.fromJSON(
      sdWithCodeableReference.differential.element[2]
    );
    const onlyRules = OnlyRuleExtractor.process(element);
    const firstOnlyRule = new ExportableOnlyRule('extension[bar].value[x]');
    firstOnlyRule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/Practitioner', isReference: true },
      { type: 'http://hl7.org/fhir/StructureDefinition/Patient', isReference: true },
      { type: 'CodeableReference' }
    ];
    const secondOnlyRule = new ExportableOnlyRule('extension[bar].valueCodeableReference');
    secondOnlyRule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/Observation', isReference: true },
      { type: 'http://hl7.org/fhir/StructureDefinition/DiagnosticReport', isReference: true }
    ];
    expect(onlyRules).toHaveLength(2);
    expect(onlyRules).toEqual([firstOnlyRule, secondOnlyRule]);
    expect(element.processedPaths).toEqual([
      'type[0].targetProfile[0]',
      'type[0].targetProfile[1]',
      'type[0].code',
      'type[1].targetProfile[0]',
      'type[1].targetProfile[1]',
      'type[1].code'
    ]);
  });

  it('should extract only rules on an element with CodeableReference and non-Reference types', () => {
    const element = ProcessableElementDefinition.fromJSON(
      sdWithCodeableReference.differential.element[3]
    );
    const onlyRules = OnlyRuleExtractor.process(element);
    const firstOnlyRule = new ExportableOnlyRule('extension[cookie].value[x]');
    firstOnlyRule.types = [{ type: 'string' }, { type: 'CodeableReference' }];
    const secondOnlyRule = new ExportableOnlyRule('extension[cookie].valueCodeableReference');
    secondOnlyRule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/Observation', isReference: true },
      { type: 'http://hl7.org/fhir/StructureDefinition/DiagnosticReport', isReference: true }
    ];
    expect(onlyRules).toHaveLength(2);
    expect(onlyRules).toEqual([firstOnlyRule, secondOnlyRule]);
    expect(element.processedPaths).toEqual([
      'type[0].code',
      'type[1].targetProfile[0]',
      'type[1].targetProfile[1]',
      'type[1].code'
    ]);
  });

  it('should return no rules when the element has no type info', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[4]);
    const onlyRule = OnlyRuleExtractor.process(element);
    expect(onlyRule).toHaveLength(0);
    expect(element.processedPaths).toEqual([]);
  });
});
