import { fhirtypes } from 'fsh-sushi/';
import { getPath } from '../../src/utils';

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
});
