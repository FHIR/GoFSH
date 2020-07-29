import { ExportableValueSetComponentRule } from '../../src/exportable';

describe('ExportableValueSetComponentRule', () => {
  it('should export a comment that it is unimplemented', () => {
    const rule = new ExportableValueSetComponentRule(true);
    rule.from = { system: 'http://unitsofmeasure.org' };

    expect(rule.toFSH()).toBe('// Unimplemented: value set component rule');
  });
});
