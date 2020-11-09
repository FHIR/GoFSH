import path from 'path';
import fs from 'fs-extra';
import { fshtypes } from 'fsh-sushi';
import { ValueSetProcessor } from '../../src/processor';
import { ExportableValueSet } from '../../src/exportable';

const { FshCode } = fshtypes;

describe('ValueSetProcessor', () => {
  describe('#process', () => {
    it('should convert the simplest ValueSet', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-valueset.json'), 'utf-8')
      );
      const result = ValueSetProcessor.process(input);
      expect(result).toBeInstanceOf(ExportableValueSet);
      expect(result.name).toBe('SimpleValueSet');
    });

    it('should not convert a ValueSet without a name or id', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-valueset.json'), 'utf-8')
      );
      const result = ValueSetProcessor.process(input);
      expect(result).toBeUndefined();
    });

    it('should convert a ValueSet without a name but with an id', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-valueset-with-id.json'), 'utf-8')
      );
      const result = ValueSetProcessor.process(input);
      expect(result).toBeInstanceOf(ExportableValueSet);
      expect(result.name).toBe('MyValueSet');
      expect(result.id).toBe('my.value-set');
    });

    it('should have rules on a converted ValueSet with components', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'composed-valueset.json'), 'utf-8')
      );
      const result = ValueSetProcessor.process(input);
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
      ValueSetProcessor.extractRules(input, workingValueSet);

      expect(workingValueSet.rules).toHaveLength(4);
      expect(workingValueSet.rules).toContainEqual(
        expect.objectContaining({
          inclusion: true,
          from: {
            system: 'http://example.org/zoo'
          },
          concepts: [
            new FshCode('BEAR', 'http://example.org/zoo', 'Bear'),
            new FshCode('PEL', 'http://example.org/zoo', 'Pelican')
          ]
        })
      );
      expect(workingValueSet.rules).toContainEqual(
        expect.objectContaining({
          inclusion: true,
          from: {
            system: 'http://example.org/aquarium',
            valueSets: ['http://example.org/mammals']
          },
          concepts: [new FshCode('SEAL', 'http://example.org/aquarium', 'Seal')]
        })
      );
      expect(workingValueSet.rules).toContainEqual(
        expect.objectContaining({
          inclusion: false,
          from: {
            system: 'http://example.org/zoo'
          },
          concepts: [new FshCode('CAT', 'http://example.org/zoo', 'Cat')]
        })
      );
      expect(workingValueSet.rules).toContainEqual(
        expect.objectContaining({
          inclusion: false,
          from: {
            system: 'http://example.org/aquarium',
            valueSets: ['http://example.org/mollusks', 'http://example.org/invertebrates']
          },
          concepts: [
            new FshCode('BARN', 'http://example.org/aquarium', 'Barnacle'),
            new FshCode('CLAM', 'http://example.org/aquarium', 'Clam')
          ]
        })
      );
    });
  });
});
