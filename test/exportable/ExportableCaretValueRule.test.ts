import { ExportableCaretValueRule } from '../../src/exportable';

describe('ExportableCaretValueRule', () => {
  it('should export a comment that it is unimplemented', () => {
    const rule = new ExportableCaretValueRule('');
    rule.caretPath = 'url';
    rule.value = 'http://foo.org';

    expect(rule.toFSH()).toBe('// Unimplemented: caret value rule');
  });
});
