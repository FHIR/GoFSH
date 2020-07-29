import { ExportableInsertRule } from '../../src/exportable';

describe('ExportableInsertRule', () => {
  it('should export a comment that it is unimplemented', () => {
    const rule = new ExportableInsertRule();
    rule.ruleSet = 'FooRuleSet';

    expect(rule.toFSH()).toBe('// Unimplemented: insert rule');
  });
});
