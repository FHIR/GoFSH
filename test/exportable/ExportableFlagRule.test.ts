import { ExportableFlagRule } from '../../src/exportable';

describe('ExportableFlagRule', () => {
  it('should export a FlagRule with mustSupport', () => {
    const rule = new ExportableFlagRule('name');
    rule.mustSupport = true;

    expect(rule.toFSH()).toBe('* name MS');
  });

  it('should export a FlagRule with isModifier', () => {
    const rule = new ExportableFlagRule('name');
    rule.modifier = true;

    expect(rule.toFSH()).toBe('* name ?!');
  });

  it('should export a FlagRule with isSummary', () => {
    const rule = new ExportableFlagRule('name');
    rule.summary = true;

    expect(rule.toFSH()).toBe('* name SU');
  });

  it('should export a FlagRule with trialUse', () => {
    const rule = new ExportableFlagRule('name');
    rule.trialUse = true;

    expect(rule.toFSH()).toBe('* name TU');
  });

  it('should export a FlagRule with normative', () => {
    const rule = new ExportableFlagRule('name');
    rule.normative = true;

    expect(rule.toFSH()).toBe('* name N');
  });

  it('should export a FlagRule with draft', () => {
    const rule = new ExportableFlagRule('name');
    rule.draft = true;

    expect(rule.toFSH()).toBe('* name D');
  });

  it('should export a FlagRule with multiple valid flags', () => {
    const rule = new ExportableFlagRule('name');
    rule.mustSupport = true;
    rule.summary = true;
    rule.trialUse = true;

    expect(rule.toFSH()).toBe('* name MS SU TU');
  });

  it('should export an indented FlagRule', () => {
    const rule = new ExportableFlagRule('name');
    rule.trialUse = true;
    rule.indent = 2;

    expect(rule.toFSH()).toBe('    * name TU');
  });

  it('should export a FlagRule and apply draft status over trialUse and normative', () => {
    const rule = new ExportableFlagRule('name');
    rule.draft = true;
    rule.trialUse = true;
    rule.normative = true;

    expect(rule.toFSH()).toBe('* name D');
  });

  it('should export a FlagRule and apply trialUse status over normative', () => {
    const rule = new ExportableFlagRule('name');
    rule.trialUse = true;
    rule.normative = true;

    expect(rule.toFSH()).toBe('* name TU');
  });
});
