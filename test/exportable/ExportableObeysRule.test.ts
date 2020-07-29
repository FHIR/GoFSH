import { ExportableObeysRule } from '../../src/exportable';

describe('ExportableObeysRule', () => {
  it('should export a comment that it is unimplemented', () => {
    const rule = new ExportableObeysRule('component');
    rule.invariant = 'FSH-1';

    expect(rule.toFSH()).toBe('// Unimplemented: obeys rule');
  });
});
