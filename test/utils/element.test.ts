import { fhirtypes, fhirdefs, fshtypes } from 'fsh-sushi';
import { cloneDeep } from 'lodash';
import {
  getFSHValue,
  getPath,
  getPathValuePairs,
  getCardinality,
  getAncestorElement
} from '../../src/utils';
import { ProcessableElementDefinition, ProcessableStructureDefinition } from '../../src/processor';

import { loadTestDefinitions } from '../helpers/loadTestDefinitions';

describe('element', () => {
  let defs: fhirdefs.FHIRDefinitions;

  beforeAll(() => {
    defs = loadTestDefinitions();
  });

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
    it('should convert a code value into a FSHCode', () => {
      const value = getFSHValue('type[0].aggregation[0]', 'contained', 'ElementDefinition', defs);
      expect(value).toEqual(new fshtypes.FshCode('contained'));
    });

    it('should FSHify a string', () => {
      const value = getFSHValue('short', 'This is a "string"', 'ElementDefinition', defs);
      expect(value).toEqual('This is a \\"string\\"');
    });
    it('should leave a non-code value as is', () => {
      const value = getFSHValue(
        'type[0].profile[0]',
        'http://foo.com/bar',
        'ElementDefinition',
        defs
      );
      expect(value).toEqual('http://foo.com/bar');
    });
  });

  describe('#getAncestorElement', () => {
    let vitalsJson: any;
    let vitals: ProcessableStructureDefinition;

    beforeAll(() => {
      vitalsJson = defs.fishForFHIR('vitalsigns');
    });

    beforeEach(() => {
      vitals = cloneDeep(vitalsJson);
    });

    it('should find an element from the snapshot of the parent', () => {
      const status = getAncestorElement('Observation.status', vitals, defs);
      expect(status.id).toBe('Observation.status');
    });

    it('should find an element from the differential of the parent', () => {
      const vitalChild = {
        name: 'vitalchild',
        resourceType: 'Observation',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/vitalsigns'
      };
      const vsCat = getAncestorElement('Observation.category:VSCat', vitalChild, defs);
      expect(vsCat.id).toBe('Observation.category:VSCat');
    });

    it('should find an element from a grandparent', () => {
      const vitalChild = {
        name: 'vitalchild',
        resourceType: 'Observation',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/vitalsigns',
        url: 'http://hl7.org/StructureDefinition/vitalchild'
      };
      const vsCat = getAncestorElement('Observation.identifier', vitalChild, defs);
      expect(vsCat.id).toBe('Observation.identifier');
    });

    it('should return null when no element is found', () => {
      expect(getAncestorElement('Observation.foo', vitals, defs)).toBeNull();
    });
  });

  describe('#getCardinality', () => {
    let observationJson: any;
    let vitalsJson: any;
    let observation: ProcessableStructureDefinition;
    let vitals: ProcessableStructureDefinition;

    beforeAll(() => {
      observationJson = defs.fishForFHIR('Observation');
      vitalsJson = defs.fishForFHIR('vitalsigns');
    });

    beforeEach(() => {
      observation = cloneDeep(observationJson);
      vitals = cloneDeep(vitalsJson);
    });

    it('should get the cardinality from the current snapshot', () => {
      const card = getCardinality('Observation.status', observation, defs);
      expect(card).toEqual({ min: 1, max: '1' });
    });

    it('should get the cardinality from the current differential', () => {
      const card = getCardinality('Observation.category:VSCat', vitals, defs);
      expect(card).toEqual({ min: 1, max: '1' });
    });

    it('should get the cardinality from the parent', () => {
      const card = getCardinality('Observation.identifier', vitals, defs);
      expect(card).toEqual({ min: 0, max: '*' });
    });

    it('should prefer cardinality on the child StructureDefinition', () => {
      const identifier = new ProcessableElementDefinition('Observation.identifier');
      identifier.min = 2;
      vitals.differential.element.push(identifier);
      const card = getCardinality('Observation.identifier', vitals, defs);
      // min from the child is preferred, max from the parent is used
      expect(card).toEqual({ min: 2, max: '*' });
    });

    it('should return null when an element cannot be found', () => {
      expect(getCardinality('Observation.foo', vitals, defs)).toBeNull();
    });

    it('should return null when not all cardinality info can be found', () => {
      const foo = new ProcessableElementDefinition('Observation.foo');
      foo.min = 2;
      vitals.differential.element.push(foo);
      expect(getCardinality('Observation.foo', vitals, defs)).toBeNull();
    });
  });
});
