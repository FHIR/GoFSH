import { ExportableOnlyRule } from '../../src/exportable';

describe('ExportableOnlyRule', () => {
  it('should export an OnlyRule with one non-Reference type', () => {
    const rule = new ExportableOnlyRule('value[x]');
    rule.types = [{ type: 'Quantity' }];
    expect(rule.toFSH()).toBe('* value[x] only Quantity');
  });

  it('should export an OnlyRule with multiple non-Reference types', () => {
    const rule = new ExportableOnlyRule('value[x]');
    rule.types = [{ type: 'Quantity' }, { type: 'string' }];
    expect(rule.toFSH()).toBe('* value[x] only Quantity or string');
  });

  it('should export an OnlyRule with one Reference type', () => {
    const rule = new ExportableOnlyRule('basedOn');
    rule.types = [{ type: 'FooReferenceProfile', isReference: true }];
    expect(rule.toFSH()).toBe('* basedOn only Reference(FooReferenceProfile)');
  });

  it('should export an OnlyRule with multiple Reference types', () => {
    const rule = new ExportableOnlyRule('basedOn');
    rule.types = [
      { type: 'FooReferenceProfile', isReference: true },
      { type: 'BarReferenceProfile', isReference: true }
    ];
    expect(rule.toFSH()).toBe(
      '* basedOn only Reference(FooReferenceProfile or BarReferenceProfile)'
    );
  });

  it('should export an OnlyRule with Reference and non-Reference types', () => {
    const rule = new ExportableOnlyRule('value[x]');
    rule.types = [
      { type: 'FooReferenceProfile', isReference: true },
      { type: 'BarReferenceProfile', isReference: true },
      { type: 'Quantity' },
      { type: 'string' }
    ];
    expect(rule.toFSH()).toBe(
      '* value[x] only Quantity or string or Reference(FooReferenceProfile or BarReferenceProfile)'
    );
  });
});
