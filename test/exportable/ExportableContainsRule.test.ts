import { EOL } from 'os';
import {
  ExportableCardRule,
  ExportableContainsRule,
  ExportableFlagRule
} from '../../src/exportable';

describe('ExportableContainsRule', () => {
  it('should export a basic contains rule', () => {
    // NOTE: All contains rules must have a card rule, so this case is purely for testing purposes.
    const rule = new ExportableContainsRule('component');
    rule.items = [{ name: 'systolic' }];

    expect(rule.toFSH()).toBe('* component contains systolic');
  });

  it('should export a contains rule with one named item', () => {
    // NOTE: All contains rules must have a card rule, so this case is purely for testing purposes.
    const rule = new ExportableContainsRule('component');
    rule.items = [{ name: 'systolic', type: 'SystolicBP' }];

    expect(rule.toFSH()).toBe('* component contains SystolicBP named systolic');
  });

  it('should export a contains rule with multiple items', () => {
    // NOTE: All contains rules must have a card rule, so this case is purely for testing purposes.
    const rule = new ExportableContainsRule('component');
    rule.items = [
      { name: 'systolic', type: 'SystolicBP' },
      { name: 'diastolic', type: 'DiastolicBP' }
    ];

    const expectedFSH = `* component contains${EOL}    SystolicBP named systolic and${EOL}    DiastolicBP named diastolic`;

    expect(rule.toFSH()).toBe(expectedFSH);
  });

  it('should export a contains rule with multiple items each with a card rule', () => {
    const containsRule = new ExportableContainsRule('component');
    containsRule.items = [
      { name: 'systolic', type: 'SystolicBP' },
      { name: 'diastolic', type: 'DiastolicBP' }
    ];

    const cardRuleSystolic = new ExportableCardRule('component[systolic]');
    cardRuleSystolic.min = 0;
    cardRuleSystolic.max = '1';
    const cardRuleDiastolic = new ExportableCardRule('component[diastolic]');
    cardRuleDiastolic.min = 0;
    cardRuleDiastolic.max = '1';
    containsRule.cardRules.push(cardRuleSystolic, cardRuleDiastolic);

    const expectedFSH = `* component contains${EOL}    SystolicBP named systolic 0..1 and${EOL}    DiastolicBP named diastolic 0..1`;

    expect(containsRule.toFSH()).toBe(expectedFSH);
  });

  it('should export a contains rule with multiple items each with a card rule and flag rule', () => {
    const containsRule = new ExportableContainsRule('component');
    containsRule.items = [
      { name: 'systolic', type: 'SystolicBP' },
      { name: 'diastolic', type: 'DiastolicBP' }
    ];

    const cardRuleSystolic = new ExportableCardRule('component[systolic]');
    cardRuleSystolic.min = 0;
    cardRuleSystolic.max = '1';
    const cardRuleDiastolic = new ExportableCardRule('component[diastolic]');
    cardRuleDiastolic.min = 0;
    cardRuleDiastolic.max = '1';
    containsRule.cardRules.push(cardRuleSystolic, cardRuleDiastolic);

    const flagRuleSystolic = new ExportableFlagRule('component[systolic]');
    flagRuleSystolic.mustSupport = true;
    flagRuleSystolic.summary = true;
    flagRuleSystolic.trialUse = true;
    const flagRuleDiastolic = new ExportableFlagRule('component[diastolic]');
    flagRuleDiastolic.mustSupport = true;
    containsRule.flagRules.push(flagRuleSystolic, flagRuleDiastolic);

    const expectedFSH = `* component contains${EOL}    SystolicBP named systolic 0..1 MS SU TU and${EOL}    DiastolicBP named diastolic 0..1 MS`;

    expect(containsRule.toFSH()).toBe(expectedFSH);
  });
});
