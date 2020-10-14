import { ExportableObeysRule } from '../../src/exportable';

describe('ExportableObeysRule', () => {
  it('should export an ObeysRule with one invariant', () => {
    const rule = new ExportableObeysRule('component');
    rule.keys = ['FSH-1'];

    expect(rule.toFSH()).toBe('* component obeys FSH-1');
  });

  it('should export an ObeysRule with multiple invariants', () => {
    const rule = new ExportableObeysRule('component');
    rule.keys = ['FSH-2', 'FSH-3', 'FSH-4'];

    expect(rule.toFSH()).toBe('* component obeys FSH-2 and FSH-3 and FSH-4');
  });

  it('should export an ObeysRule on the root element', () => {
    const rule = new ExportableObeysRule('.');
    rule.keys = ['FSH-5', 'FSH-6'];

    expect(rule.toFSH()).toBe('* obeys FSH-5 and FSH-6');
  });
});
