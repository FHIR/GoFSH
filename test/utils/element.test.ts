import path from 'path';
import { fhirtypes, fhirdefs } from 'fsh-sushi';
import { getFSHValue, getPath, getPathValuePairs } from '../../src/utils';
import { ProcessableElementDefinition } from '../../src/processor';
import { FshCode } from 'fsh-sushi/dist/fshtypes';

describe('element', () => {
  describe('#getPath', () => {
    // Basic paths
    it('should get the path for an element', () => {
      expect(getPath(new fhirtypes.ElementDefinition('Observation.status'))).toBe('status');
    });

    it('should get the path for a nested element', () => {
      expect(getPath(new fhirtypes.ElementDefinition('Observation.identifier.type'))).toBe(
        'identifier.type'
      );
    });

    it('should get the path for the root element', () => {
      expect(getPath(new fhirtypes.ElementDefinition('Observation'))).toBe('.');
    });

    // Slice paths
    it('should get the path for a sliced element', () => {
      expect(getPath(new fhirtypes.ElementDefinition('Observation.extension:foo'))).toBe(
        'extension[foo]'
      );
    });

    it('should get the path for a nested sliced element', () => {
      expect(getPath(new fhirtypes.ElementDefinition('Observation.extension.extension:foo'))).toBe(
        'extension.extension[foo]'
      );
    });

    it('should get the path for a child of a sliced element', () => {
      expect(getPath(new fhirtypes.ElementDefinition('Observation.extension:foo.id'))).toBe(
        'extension[foo].id'
      );
    });

    it('should get the path for a sliced child of a sliced element', () => {
      expect(
        getPath(new fhirtypes.ElementDefinition('Observation.extension:foo.extension:bar'))
      ).toBe('extension[foo].extension[bar]');
    });

    it('should get the path for a resliced element', () => {
      expect(getPath(new fhirtypes.ElementDefinition('Observation.extension:foo/bar'))).toBe(
        'extension[foo][bar]'
      );
    });

    it('should get the path for a mulitple resliced element', () => {
      expect(getPath(new fhirtypes.ElementDefinition('Observation.extension:foo/bar/bam'))).toBe(
        'extension[foo][bar][bam]'
      );
    });

    // Choice paths
    it('should get the path for a choice element', () => {
      expect(getPath(new fhirtypes.ElementDefinition('Observation.value[x]:valueString'))).toBe(
        'valueString'
      );
    });

    it('should get the path for a child of a choice element', () => {
      expect(getPath(new fhirtypes.ElementDefinition('Observation.value[x]:valueString.id'))).toBe(
        'valueString.id'
      );
    });
  });
  describe('#getPathValuePairs', () => {
    it('should not change a top-level path', () => {
      expect(getPathValuePairs({ test: 'foo' })).toEqual({ test: 'foo' });
    });

    it('should ignore undefind keys', () => {
      expect(getPathValuePairs({ test1: 'foo', test2: undefined, test3: false })).toEqual({
        test1: 'foo',
        test3: false
      });
    });

    it('should join a nested value with "."', () => {
      expect(getPathValuePairs({ test: { ing: 'foo' } })).toEqual({ 'test.ing': 'foo' });
    });

    it('should convert array indices to bracket notation for a top-level array', () => {
      expect(getPathValuePairs({ test: ['foo', 'bar'] })).toEqual({
        'test[0]': 'foo',
        'test[1]': 'bar'
      });
    });

    it('should convert array indices to bracket notation for a nested array', () => {
      expect(getPathValuePairs({ test: { ing: ['foo', 'bar'] } })).toEqual({
        'test.ing[0]': 'foo',
        'test.ing[1]': 'bar'
      });
    });

    it('should convert array indices to bracket notation for a nested array with children', () => {
      expect(getPathValuePairs({ test: { ing: [{ stuff: 'foo' }, { stuff: 'bar' }] } })).toEqual({
        'test.ing[0].stuff': 'foo',
        'test.ing[1].stuff': 'bar'
      });
    });
  });
  describe('#getFSHValue', () => {
    let defs: fhirdefs.FHIRDefinitions;

    beforeAll(() => {
      defs = new fhirdefs.FHIRDefinitions();
      fhirdefs.loadFromPath(path.join(__dirname, '..', 'utils', 'testdefs'), 'testPackage', defs);
    });

    it('should convert a code value into a FSHCode', () => {
      const value = getFSHValue(
        'type[0].aggregation[0]',
        'contained',
        new ProcessableElementDefinition(),
        defs
      );
      expect(value).toEqual(new FshCode('contained'));
    });

    it('should FSHify a string', () => {
      const value = getFSHValue(
        'short',
        'This is a "string"',
        new ProcessableElementDefinition(),
        defs
      );
      expect(value).toEqual('This is a \\"string\\"');
    });
    it('should leave a non-code value as is', () => {
      const value = getFSHValue(
        'type[0].profile[0]',
        'http://foo.com/bar',
        new ProcessableElementDefinition(),
        defs
      );
      expect(value).toEqual('http://foo.com/bar');
    });
  });
});
