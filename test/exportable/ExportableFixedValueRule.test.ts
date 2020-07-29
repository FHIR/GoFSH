import { ExportableFixedValueRule } from '../../src/exportable';

describe('ExportableFixedValueRule', () => {
  it('should export a comment that it is unimplemented', () => {
    const rule = new ExportableFixedValueRule('active');
    rule.fixedValue = true;

    expect(rule.toFSH()).toBe('// Unimplemented: fixed value rule');
  });
});
