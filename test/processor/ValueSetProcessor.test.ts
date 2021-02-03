import path from 'path';
import fs from 'fs-extra';
import { fshtypes, fhirdefs } from 'fsh-sushi';
import { ValueSetProcessor } from '../../src/processor';
import {
  ExportableCaretValueRule,
  ExportableValueSetFilterComponentRule,
  ExportableValueSet,
  ExportableValueSetConceptComponentRule
} from '../../src/exportable';
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';
const { FshCode } = fshtypes;

describe('ValueSetProcessor', () => {
  let defs: fhirdefs.FHIRDefinitions;
  let config: fshtypes.Configuration;

  beforeAll(() => {
    defs = loadTestDefinitions();
    config = {
      canonical: 'http://hl7.org/fhir/sushi-test',
      fhirVersion: ['4.0.1']
    };
  });
  describe('#process', () => {
    it('should convert the simplest ValueSet', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-valueset.json'), 'utf-8')
      );
      const result = ValueSetProcessor.process(input, defs, config);
      expect(result).toBeInstanceOf(ExportableValueSet);
      expect(result.name).toBe('SimpleValueSet');
    });

    it('should not convert a ValueSet without a name or id', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-valueset.json'), 'utf-8')
      );
      const result = ValueSetProcessor.process(input, defs, config);
      expect(result).toBeUndefined();
    });

    it('should not convert a ValueSet with an included concept designation', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'composed-valueset.json'), 'utf-8')
      );
      input.compose.include[0].concept[0].designation = {
        value: 'ourse'
      };
      const result = ValueSetProcessor.process(input, defs, config);
      expect(result).toBeUndefined();
    });

    it('should not convert a ValueSet with an excluded concept designation', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'composed-valueset.json'), 'utf-8')
      );
      input.compose.exclude[0].concept[0].designation = {
        value: 'chatte'
      };
      const result = ValueSetProcessor.process(input, defs, config);
      expect(result).toBeUndefined();
    });

    it('should not convert a ValueSet with a compose.include id', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'composed-valueset.json'), 'utf-8')
      );
      input.compose.include[0].id = 'some-id';
      const result = ValueSetProcessor.process(input, defs, config);
      expect(result).toBeUndefined();
    });

    it('should not convert a ValueSet with a compose.include.system extension', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'composed-valueset.json'), 'utf-8')
      );
      input.compose.include[0]._system = {
        extension: {}
      };
      const result = ValueSetProcessor.process(input, defs, config);
      expect(result).toBeUndefined();
    });

    it('should convert a ValueSet without a name but with an id', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-valueset-with-id.json'), 'utf-8')
      );
      const result = ValueSetProcessor.process(input, defs, config);
      expect(result).toBeInstanceOf(ExportableValueSet);
      expect(result.name).toBe('MyValueSet');
      expect(result.id).toBe('my.value-set');
    });

    it('should have rules on a converted ValueSet with components', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'composed-valueset.json'), 'utf-8')
      );
      const result = ValueSetProcessor.process(input, defs, config);
      expect(result.rules.length).toBeGreaterThan(0);
    });
  });

  describe('#extractKeywords', () => {
    it('should get keywords for a ValueSet with simple metadata', () => {
      // Simple metadata fields are Id, Title, Description
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-valueset.json'), 'utf-8')
      );
      const workingValueSet = new ExportableValueSet('MyValueSet');
      ValueSetProcessor.extractKeywords(input, workingValueSet);

      expect(workingValueSet.id).toBe('my-value-set');
      expect(workingValueSet.title).toBe('My Value Set');
      expect(workingValueSet.description).toBe('This is my simple value set with metadata');
    });
  });

  describe('#extractRules', () => {
    it('should add rules to a value set', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'composed-valueset.json'), 'utf-8')
      );
      const workingValueSet = new ExportableValueSet('ComposedValueSet');
      ValueSetProcessor.extractRules(input, workingValueSet, defs, config);

      const rules = workingValueSet.rules;
      expect(rules).toHaveLength(8);

      const expectedRule0 = new ExportableValueSetConceptComponentRule(true);
      expectedRule0.from.system = 'http://example.org/zoo';
      expectedRule0.concepts = [
        new FshCode('BEAR', 'http://example.org/zoo', 'Bear'),
        new FshCode('PEL', 'http://example.org/zoo', 'Pelican')
      ];
      expect(rules).toContainEqual<ExportableValueSetConceptComponentRule>(expectedRule0);

      const expectedRule1 = new ExportableValueSetConceptComponentRule(true);
      expectedRule1.from.system = 'http://example.org/aquarium';
      expectedRule1.from.valueSets = ['http://example.org/mammals'];
      expectedRule1.concepts = [new FshCode('SEAL', 'http://example.org/aquarium', 'Seal')];
      expect(rules).toContainEqual<ExportableValueSetConceptComponentRule>(expectedRule1);

      const expectedRule2 = new ExportableValueSetFilterComponentRule(true);
      expectedRule2.from = { system: 'http://example.org/ghost-house' };
      expect(rules).toContainEqual<ExportableValueSetFilterComponentRule>(expectedRule2);

      const expectedRule3 = new ExportableValueSetFilterComponentRule(true);
      expectedRule3.from = { system: 'http://example.org/planetarium' };
      expectedRule3.filters = [
        { property: 'gaseous', operator: fshtypes.VsOperator.EQUALS, value: 'true' }
      ];
      expect(rules).toContainEqual<ExportableValueSetFilterComponentRule>(expectedRule3);

      const expectedRule4 = new ExportableValueSetFilterComponentRule(true);
      expectedRule4.from = { system: 'http://example.org/eatery' };
      expectedRule4.filters = [
        {
          property: 'species',
          operator: fshtypes.VsOperator.IS_A,
          value: new fshtypes.FshCode('fish')
        }
      ];
      expect(rules).toContainEqual<ExportableValueSetFilterComponentRule>(expectedRule4);

      const expectedRule5 = new ExportableValueSetConceptComponentRule(false);
      expectedRule5.from.system = 'http://example.org/zoo';
      expectedRule5.concepts = [new FshCode('CAT', 'http://example.org/zoo', 'Cat')];
      expect(rules).toContainEqual<ExportableValueSetConceptComponentRule>(expectedRule5);

      const expectedRule6 = new ExportableValueSetConceptComponentRule(false);
      expectedRule6.from.system = 'http://example.org/aquarium';
      expectedRule6.from.valueSets = [
        'http://example.org/mollusks',
        'http://example.org/invertebrates'
      ];
      expectedRule6.concepts = [
        new FshCode('BARN', 'http://example.org/aquarium', 'Barnacle'),
        new FshCode('CLAM', 'http://example.org/aquarium', 'Clam')
      ];
      expect(rules).toContainEqual<ExportableValueSetConceptComponentRule>(expectedRule6);

      const expectedRule7 = new ExportableValueSetFilterComponentRule(false);
      expectedRule7.from = { system: 'http://example.org/eatery' };
      expectedRule7.filters = [
        { property: 'tastiness', operator: fshtypes.VsOperator.EXISTS, value: true }
      ];
      expect(rules).toContainEqual<ExportableValueSetFilterComponentRule>(expectedRule7);
    });

    it('should add caret rules to a ValueSet', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-valueset.json'), 'utf-8')
      );

      // Initially it should not have any caret rules
      const targetValueSet = new ExportableValueSet('MyValueSet');
      ValueSetProcessor.extractRules(input, targetValueSet, defs, config);
      expect(targetValueSet.rules).toHaveLength(3);
      targetValueSet.rules.forEach(r => {
        expect(r).not.toBeInstanceOf(ExportableCaretValueRule);
      });

      input.experimental = true;
      ValueSetProcessor.extractRules(input, targetValueSet, defs, config);
      const experimentalRule = new ExportableCaretValueRule('');
      experimentalRule.caretPath = 'experimental';
      experimentalRule.value = true;
      expect(targetValueSet.rules).toHaveLength(4);
      expect(targetValueSet.rules).toContainEqual<ExportableCaretValueRule>(experimentalRule);
    });
  });
});
