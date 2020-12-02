import { ExportableAlias } from '../../src/exportable';

describe('ExportableAlias', () => {
  it('should export an alias', () => {
    const alias = new ExportableAlias('LNC', 'http://loinc.org');
    expect(alias.toFSH()).toBe('Alias: LNC = http://loinc.org');
  });
});
