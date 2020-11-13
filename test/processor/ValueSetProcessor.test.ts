import path from 'path';
import fs from 'fs-extra';
import { fhirdefs } from 'fsh-sushi';
import { ValueSetProcessor } from '../../src/processor';
import { ExportableCaretValueRule, ExportableValueSet } from '../../src/exportable';
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';

describe('ValueSetProcessor', () => {
  let defs: fhirdefs.FHIRDefinitions;

  beforeAll(() => {
    defs = loadTestDefinitions();
  });

  describe('#process', () => {
    it('should convert the simplest ValueSet', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-valueset.json'), 'utf-8')
      );
      const result = ValueSetProcessor.process(input, defs);
      expect(result).toBeInstanceOf(ExportableValueSet);
      expect(result.name).toBe('SimpleValueSet');
    });

    it('should convert a ValueSet with simple metadata', () => {
      // Simple metadata fields are Id, Title, Description
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-valueset.json'), 'utf-8')
      );
      const result = ValueSetProcessor.process(input, defs);
      expect(result).toBeInstanceOf(ExportableValueSet);
      expect(result.name).toBe('MyValueSet');
      expect(result.id).toBe('my-value-set');
      expect(result.title).toBe('My Value Set');
      expect(result.description).toBe('This is my simple value set with metadata');
    });

    it('should not convert a ValueSet without a name or id', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-valueset.json'), 'utf-8')
      );
      const result = ValueSetProcessor.process(input, defs);
      expect(result).toBeUndefined();
    });

    it('should convert a ValueSet without a name but with an id', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-valueset-with-id.json'), 'utf-8')
      );
      const result = ValueSetProcessor.process(input, defs);
      expect(result).toBeInstanceOf(ExportableValueSet);
      expect(result.name).toBe('MyValueSet');
      expect(result.id).toBe('my.value-set');
    });
  });

  describe('#extractRules', () => {
    it('should add caret rules to a ValueSet', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-valueset.json'), 'utf-8')
      );

      const targetValueSet = new ExportableValueSet('MyValueSet');
      ValueSetProcessor.extractRules(input, targetValueSet, defs);
      expect(targetValueSet.rules).toHaveLength(0);

      input.experimental = true;
      ValueSetProcessor.extractRules(input, targetValueSet, defs);
      const experimentalRule = new ExportableCaretValueRule('');
      experimentalRule.caretPath = 'experimental';
      experimentalRule.value = true;
      expect(targetValueSet.rules.length).toBe(1);
      expect(targetValueSet.rules).toContainEqual<ExportableCaretValueRule>(experimentalRule);
    });
  });
});
