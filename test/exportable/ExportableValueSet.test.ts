import { ExportableValueSet } from '../../src/exportable';

describe('ExportableValueSet', () => {
  it('should export a comment that it is unimplemented', () => {
    const cs = new ExportableValueSet('MyValueSet');

    expect(cs.toFSH()).toBe('// Unimplemented: ValueSet');
  });
});
