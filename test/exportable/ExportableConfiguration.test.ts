import { ExportableConfiguration } from '../../src/exportable';

describe('ExportableConfiguration', () => {
  let config: ExportableConfiguration;

  beforeAll(() => {
    config = new ExportableConfiguration({
      id: 'my.test.package',
      canonical: 'http://example.org/test/package',
      fhirVersion: ['4.0.1']
    });
  });

  it('should include the required configuration fields in the exported yaml', () => {
    const yaml = config.toFSH();
    expect(yaml).toMatch(/id: my\.test\.package/s);
    expect(yaml).toMatch(/canonical: http:\/\/example.org\/test\/package/s);
    expect(yaml).toMatch(/fhirVersion: 4\.0\.1/s);
  });
});
