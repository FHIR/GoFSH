import { ExportableConfiguration } from '../../src/exportable';

describe('ExportableConfiguration', () => {
  describe('#requiredFields', () => {
    let result: string;

    beforeAll(() => {
      const config = new ExportableConfiguration({
        canonical: 'http://example.org/test/package',
        fhirVersion: ['4.0.1']
      });
      result = config.toFSH();
    });

    it('should include the canonical url', () => {
      expect(result).toMatch(/^canonical: http:\/\/example.org\/test\/package/m);
    });

    it('should include the FHIR version', () => {
      expect(result).toMatch(/^fhirVersion: 4\.0\.1/m);
    });

    it('should not include optional fields not present in the configuration', () => {
      expect(result).not.toMatch(/^id: /m);
      expect(result).not.toMatch(/^name: /m);
      expect(result).not.toMatch(/^status: /m);
      expect(result).not.toMatch(/^version: /m);
    });
  });

  describe('#optionalFields', () => {
    let result: string;

    beforeAll(() => {
      const config = new ExportableConfiguration({
        canonical: 'http://example.org/test/package',
        fhirVersion: ['4.0.1'],
        id: 'a.special.package',
        name: 'SpecialTestPackage',
        status: 'active',
        version: '0.13.0'
      });
      result = config.toFSH();
    });

    it('should include the id when present', () => {
      expect(result).toMatch(/^id: a\.special\.package/m);
    });

    it('should include the name when present', () => {
      expect(result).toMatch(/^name: SpecialTestPackage/m);
    });

    it('should include the status when present', () => {
      expect(result).toMatch(/^status: active/m);
    });

    it('should include the version when present', () => {
      expect(result).toMatch(/^version: 0\.13.0/m);
    });
  });
});
