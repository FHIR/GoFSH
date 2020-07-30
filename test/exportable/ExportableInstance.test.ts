import { ExportableInstance } from '../../src/exportable';

describe('ExportableInstance', () => {
  it('should export a comment that it is unimplemented', () => {
    const cs = new ExportableInstance('MyInstance');

    expect(cs.toFSH()).toBe('// Unimplemented: Instance');
  });
});
