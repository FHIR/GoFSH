import { ExportableOnlyRule } from '../../src/exportable';

describe('ExportableOnlyRule', () => {
  it('should export a comment that it is unimplemented', () => {
    const rule = new ExportableOnlyRule('value[x]');
    rule.types = [{ type: 'Quantity' }];

    expect(rule.toFSH()).toBe('// Unimplemented: only rule');
  });
});
