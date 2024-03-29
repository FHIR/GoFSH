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
    const onlyRule = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('effective[x]');
    expectedRule.types = [{ type: 'dateTime' }, { type: 'Period' }];
    expect(onlyRule).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual(['type[0].code', 'type[1].code']);
  });

  it('should extract an only rule with profiles of a type', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
    const onlyRule = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('value[x]');
    expectedRule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/SimpleQuantity' },
      { type: 'http://hl7.org/fhir/StructureDefinition/MoneyQuantity' }
    ];
    expect(onlyRule).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual([
      'type[0].profile[0]',
      'type[0].profile[1]',
      'type[0].code'
    ]);
  });

  it('should extract an only rule with a subset of a Reference type', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
    const onlyRule = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('hasMember');
    expectedRule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/Observation', isReference: true },
      { type: 'http://hl7.org/fhir/StructureDefinition/MolecularSequence', isReference: true }
    ];
    expect(onlyRule).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual([
      'type[0].targetProfile[0]',
      'type[0].targetProfile[1]',
      'type[0].code'
    ]);
  });

  it('should extract an only rule with a profile on a Reference', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]);
    const onlyRule = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('extension[foo].value[x]');
    expectedRule.types = [
      { type: 'string' },
      { type: 'http://hl7.org/fhir/StructureDefinition/ProfileOfReference' }
    ];
    expect(onlyRule).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual(['type[0].code', 'type[1].profile[0]', 'type[1].code']);
  });

  it('should extract an only rule with a subset of a CodeableReference type', () => {
    const element = ProcessableElementDefinition.fromJSON(
      sdWithCodeableReference.differential.element[0]
    );
    const onlyRule = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('activity.performedActivity');
    expectedRule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/Observation', isCodeableReference: true },
      {
        type: 'http://hl7.org/fhir/StructureDefinition/MolecularSequence',
        isCodeableReference: true
      }
    ];
    expect(onlyRule).toEqual<ExportableOnlyRule>(expectedRule);
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
    const onlyRule = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('extension[foo].value[x]');
    expectedRule.types = [
      { type: 'string' },
      { type: 'http://hl7.org/fhir/StructureDefinition/ProfileOfCodeableReference' }
    ];
    expect(onlyRule).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual(['type[0].code', 'type[1].profile[0]', 'type[1].code']);
  });

  it('should extract an only rule with a subset of a canonical type', () => {
    const element = ProcessableElementDefinition.fromJSON(
      sdWithCodeableReference.differential.element[4]
    );
    const onlyRule = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('extension[toast].value[x]');
    expectedRule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/Observation', isCanonical: true },
      {
        type: 'http://hl7.org/fhir/StructureDefinition/Patient',
        isCanonical: true
      }
    ];
    expect(onlyRule).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual([
      'type[0].targetProfile[0]',
      'type[0].targetProfile[1]',
      'type[0].code'
    ]);
  });

  it('should extract an only rule on an element with both Reference and CodeableReference types', () => {
    const element = ProcessableElementDefinition.fromJSON(
      sdWithCodeableReference.differential.element[2]
    );
    const onlyRule = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('extension[bar].value[x]');
    expectedRule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/Practitioner', isReference: true },
      { type: 'http://hl7.org/fhir/StructureDefinition/Patient', isReference: true },
      { type: 'http://hl7.org/fhir/StructureDefinition/Observation', isCodeableReference: true },
      {
        type: 'http://hl7.org/fhir/StructureDefinition/DiagnosticReport',
        isCodeableReference: true
      }
    ];
    expect(onlyRule).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual([
      'type[0].targetProfile[0]',
      'type[0].targetProfile[1]',
      'type[0].code',
      'type[1].targetProfile[0]',
      'type[1].targetProfile[1]',
      'type[1].code'
    ]);
  });

  it('should extract an only rule on an element with CodeableReference and non-Reference types', () => {
    const element = ProcessableElementDefinition.fromJSON(
      sdWithCodeableReference.differential.element[3]
    );
    const onlyRule = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('extension[cookie].value[x]');
    expectedRule.types = [
      { type: 'string' },
      { type: 'http://hl7.org/fhir/StructureDefinition/Observation', isCodeableReference: true },
      {
        type: 'http://hl7.org/fhir/StructureDefinition/DiagnosticReport',
        isCodeableReference: true
      }
    ];
    expect(onlyRule).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual([
      'type[0].code',
      'type[1].targetProfile[0]',
      'type[1].targetProfile[1]',
      'type[1].code'
    ]);
  });

  it('should extract an only rule with canonical and non-canonical types', () => {
    const element = ProcessableElementDefinition.fromJSON(
      sdWithCodeableReference.differential.element[5]
    );
    const onlyRule = OnlyRuleExtractor.process(element);
    const expectedRule = new ExportableOnlyRule('extension[blank].value[x]');
    expectedRule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/Patient', isCanonical: true },
      {
        type: 'http://hl7.org/fhir/StructureDefinition/Observation',
        isCanonical: true
      },
      { type: 'Annotation' }
    ];
    expect(onlyRule).toEqual<ExportableOnlyRule>(expectedRule);
    expect(element.processedPaths).toEqual([
      'type[0].targetProfile[0]',
      'type[0].targetProfile[1]',
      'type[0].code',
      'type[1].code'
    ]);
  });

  it('should return null when the element has no type info', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[4]);
    const onlyRule = OnlyRuleExtractor.process(element);
    expect(onlyRule).toBeNull();
    expect(element.processedPaths).toEqual([]);
  });
});
