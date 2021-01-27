import { ExportableConfiguration } from '../../src/exportable';

describe('ExportableConfiguration', () => {
  describe('#requiredFields', () => {
    let result: string;

    beforeAll(() => {
      const config = new ExportableConfiguration({
        canonical: 'http://example.org/test/package',
        fhirVersion: ['4.0.1'],
        FSHOnly: true,
        applyExtensionMetadataToRoot: false
      });
      result = config.toFSH();
    });

    it('should include the canonical url', () => {
      expect(result).toMatch(/^canonical: http:\/\/example.org\/test\/package/m);
    });

    it('should include the FHIR version', () => {
      expect(result).toMatch(/^fhirVersion: 4\.0\.1/m);
    });

    it('should include the FSHOnly flag', () => {
      expect(result).toMatch(/^FSHOnly: true/m);
    });

    it('should include the applyExtensionMetadataToRoot flag and set it to false', () => {
      expect(result).toMatch(/^applyExtensionMetadataToRoot: false/m);
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
        FSHOnly: true,
        applyExtensionMetadataToRoot: false,
        id: 'a.special.package',
        name: 'SpecialTestPackage',
        status: 'active',
        version: '0.13.0',
        dependencies: [
          {
            version: '3.1.0',
            packageId: 'hl7.fhir.us.core',
            uri: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core'
          },
          {
            version: '1.0.0',
            packageId: 'hl7.fhir.us.mcode',
            uri: 'http://hl7.org/fhir/us/mcode/ImplementationGuide/hl7.fhir.us.mcode'
          }
        ]
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

    it('should include the dependencies when present', () => {
      expect(result).toMatch(/^dependencies:/m);
      expect(result).toMatch(/^\s+hl7\.fhir\.us\.core: 3\.1\.0$/m);
      expect(result).toMatch(/^\s+hl7\.fhir\.us\.mcode: 1\.0\.0$/m);
    });
  });
});
