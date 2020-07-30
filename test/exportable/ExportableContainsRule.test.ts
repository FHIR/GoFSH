import { ExportableContainsRule } from '../../src/exportable';

describe('ExportableContainsRule', () => {
  it('should export a comment that it is unimplemented', () => {
    const rule = new ExportableContainsRule('component');
    rule.items = [{ name: 'systolic' }];

    expect(rule.toFSH()).toBe('// Unimplemented: contains rule');
  });
});
