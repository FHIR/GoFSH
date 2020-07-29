import { ExportableCardRule } from '../../src/exportable';

describe('ExportableCardRule', () => {
  it('should export a CardRule with a min and a max', () => {
    const rule = new ExportableCardRule('name');
    rule.min = 2;
    rule.max = '8';

    expect(rule.toFSH()).toBe('* name 2..8');
  });

  it('should export a CardRule with only a min', () => {
    const rule = new ExportableCardRule('photo');
    rule.min = 3;

    expect(rule.toFSH()).toBe('* photo 3..');
  });

  it('should export a CardRule with only a max', () => {
    const rule = new ExportableCardRule('contact');
    rule.max = '5';

    expect(rule.toFSH()).toBe('* contact ..5');
  });
});
