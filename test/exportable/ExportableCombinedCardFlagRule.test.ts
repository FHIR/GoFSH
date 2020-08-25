import { ExportableCombinedCardFlagRule } from '../../src/exportable/ExportableCombinedCardFlagRule';
import { ExportableCardRule, ExportableFlagRule } from '../../src/exportable';

describe('ExportableCombinedCardFlagRule', () => {
  it('should export a CombinedCardFlagRule with min and one flag', () => {
    const cardRule = new ExportableCardRule('name');
    cardRule.min = 1;
    const flagRule = new ExportableFlagRule('name');
    flagRule.mustSupport = true;
    const rule = new ExportableCombinedCardFlagRule('name', cardRule, flagRule);

    expect(rule.toFSH()).toBe('* name 1.. MS');
  });

  it('should export a CombinedCardFlagRule with max and one flag', () => {
    const cardRule = new ExportableCardRule('name');
    cardRule.max = '1';
    const flagRule = new ExportableFlagRule('name');
    flagRule.mustSupport = true;
    const rule = new ExportableCombinedCardFlagRule('name', cardRule, flagRule);

    expect(rule.toFSH()).toBe('* name ..1 MS');
  });

  it('should export a CombinedCardFlagRule with min and max and one flag', () => {
    const cardRule = new ExportableCardRule('name');
    cardRule.min = 1;
    cardRule.max = '1';
    const flagRule = new ExportableFlagRule('name');
    flagRule.mustSupport = true;
    const rule = new ExportableCombinedCardFlagRule('name', cardRule, flagRule);

    expect(rule.toFSH()).toBe('* name 1..1 MS');
  });

  it('should export a CombinedCardFlagRule with min and max and multiple flags', () => {
    const cardRule = new ExportableCardRule('name');
    cardRule.min = 1;
    cardRule.max = '1';
    const flagRule = new ExportableFlagRule('name');
    flagRule.mustSupport = true;
    flagRule.modifier = true;
    flagRule.summary = true;
    const rule = new ExportableCombinedCardFlagRule('name', cardRule, flagRule);

    expect(rule.toFSH()).toBe('* name 1..1 MS ?! SU');
  });

  it('should redirect min/max getters to cardRule', () => {
    const cardRule = new ExportableCardRule('name');
    cardRule.min = 1;
    cardRule.max = '1';
    const flagRule = new ExportableFlagRule('name');
    flagRule.mustSupport = true;
    const rule = new ExportableCombinedCardFlagRule('name', cardRule, flagRule);

    expect(rule.min).toBe(1);
    expect(rule.max).toBe('1');
  });

  it('should redirect min/max setters to cardRule', () => {
    const cardRule = new ExportableCardRule('name');
    cardRule.min = 1;
    cardRule.max = '1';
    const flagRule = new ExportableFlagRule('name');
    flagRule.mustSupport = true;
    const rule = new ExportableCombinedCardFlagRule('name', cardRule, flagRule);
    rule.min = 0;
    rule.max = '*';

    expect(rule.cardRule.min).toBe(0);
    expect(rule.cardRule.max).toBe('*');
  });
});
