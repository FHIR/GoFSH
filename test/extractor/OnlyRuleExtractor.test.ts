import path from 'path';
import fs from 'fs-extra';
import { fhirtypes } from 'fsh-sushi/';
import { OnlyRuleExtractor } from '../../src/rule-extractor';
import { ExportableOnlyRule } from '../../src/exportable';

describe('OnlyRuleExtractor', () => {
  let extractor: OnlyRuleExtractor;
  let looseSD: any;

  beforeAll(() => {
    extractor = new OnlyRuleExtractor();
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'only-profile.json'), 'utf-8').trim()
    );
  });

  it('should extract an only rule with a subset of a choice type', () => {
    const element = fhirtypes.ElementDefinition.fromJSON(looseSD.differential.element[0]);
    const onlyRule = extractor.process(element);
    const expectedRule = new ExportableOnlyRule('effective[x]');
    expectedRule.types = [{ type: 'dateTime' }, { type: 'Period' }];
    expect(onlyRule).toEqual<ExportableOnlyRule>(expectedRule);
  });

  it('should extract an only rule with profiles of a type', () => {
    const element = fhirtypes.ElementDefinition.fromJSON(looseSD.differential.element[1]);
    const onlyRule = extractor.process(element);
    const expectedRule = new ExportableOnlyRule('value[x]');
    expectedRule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/SimpleQuantity' },
      { type: 'http://hl7.org/fhir/StructureDefinition/MoneyQuantity' }
    ];
    expect(onlyRule).toEqual<ExportableOnlyRule>(expectedRule);
  });

  it('should extract an only rule with a subset of a Reference type', () => {
    const element = fhirtypes.ElementDefinition.fromJSON(looseSD.differential.element[2]);
    const onlyRule = extractor.process(element);
    const expectedRule = new ExportableOnlyRule('hasMember');
    expectedRule.types = [
      { type: 'http://hl7.org/fhir/StructureDefinition/Observation', isReference: true },
      { type: 'http://hl7.org/fhir/StructureDefinition/MolecularSequence', isReference: true }
    ];
    expect(onlyRule).toEqual<ExportableOnlyRule>(expectedRule);
  });

  it('should extract an only rule with a profile on a Reference', () => {
    const element = fhirtypes.ElementDefinition.fromJSON(looseSD.differential.element[3]);
    const onlyRule = extractor.process(element);
    const expectedRule = new ExportableOnlyRule('derivedFrom');
    expectedRule.types = [{ type: 'http://hl7.org/fhir/StructureDefinition/ProfileOfReference' }];
    expect(onlyRule).toEqual<ExportableOnlyRule>(expectedRule);
  });

  it('should return null when the element has no type info', () => {
    const element = fhirtypes.ElementDefinition.fromJSON(looseSD.differential.element[4]);
    const onlyRule = extractor.process(element);
    expect(onlyRule).toBeNull();
  });
});
