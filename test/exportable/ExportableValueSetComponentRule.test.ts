import { fshtypes } from 'fsh-sushi';
import { FshCode } from 'fsh-sushi/dist/fshtypes';
import {
  ExportableValueSetConceptComponentRule,
  ExportableValueSetFilterComponentRule
} from '../../src/exportable';

describe('ExportableValueSetConceptComponentRule', () => {
  it('should export a ValueSetConceptComponentRule with a single concept', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts.push(new fshtypes.FshCode('foo', 'bar'));

    expect(rule.toFSH()).toBe('* include bar#foo');
  });

  it('should export a ValueSetConceptComponentRule with a single excluded concept', () => {
    const rule = new ExportableValueSetConceptComponentRule(false);
    rule.concepts.push(new fshtypes.FshCode('foo', 'bar'));

    expect(rule.toFSH()).toBe('* exclude bar#foo');
  });

  it('should export a ValueSetConceptComponentRule with a single concept with system and display', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts.push(new fshtypes.FshCode('foo', 'bar', 'baz'));

    expect(rule.toFSH()).toBe('* include bar#foo "baz"');
  });

  it('should export a ValueSetConceptComponentRule with a concept from a system', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts.push(new fshtypes.FshCode('foo'));
    rule.from.system = 'someSystem';

    expect(rule.toFSH()).toBe('* include #foo from system someSystem');
  });

  it('should export a ValueSetConceptComponentRule with several concepts from a system', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts.push(new fshtypes.FshCode('foo'));
    rule.concepts.push(new fshtypes.FshCode('bar'));
    rule.from.system = 'someSystem';

    expect(rule.toFSH()).toBe('* include #foo and #bar from system someSystem');
  });

  it('should export a ValueSetConceptComponentRule with a concept from a valueset', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts.push(new fshtypes.FshCode('foo', 'bar'));
    rule.from.valueSets = ['someValueSet'];

    expect(rule.toFSH()).toBe('* include bar#foo from valueset someValueSet');
  });

  it('should export a ValueSetConceptComponentRule with a concept from several valuesets', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts.push(new fshtypes.FshCode('foo', 'bar'));
    rule.from.valueSets = ['someValueSet', 'otherValueSet'];

    expect(rule.toFSH()).toBe('* include bar#foo from valueset someValueSet and otherValueSet');
  });

  it('should export a ValueSetConceptComponentRule with a concept from a system and several valuesets', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts.push(new fshtypes.FshCode('foo'));
    rule.from.system = 'someSystem';
    rule.from.valueSets = ['someValueSet', 'otherValueSet'];

    expect(rule.toFSH()).toBe(
      '* include #foo from system someSystem and valueset someValueSet and otherValueSet'
    );
  });
});

describe('ExportableValueSetFilterComponentRule', () => {
  it('should export a ValueSetFilterComponentRule with codes from a system', () => {
    const rule = new ExportableValueSetFilterComponentRule(true);
    rule.from.system = 'someSystem';

    expect(rule.toFSH()).toBe('* include codes from system someSystem');
  });

  it('should export a ValueSetFilterComponentRule with excluded codes from a system', () => {
    const rule = new ExportableValueSetFilterComponentRule(false);
    rule.from.system = 'someSystem';

    expect(rule.toFSH()).toBe('* exclude codes from system someSystem');
  });

  it('should export a ValueSetFilterComponentRule with codes from a valueset', () => {
    const rule = new ExportableValueSetFilterComponentRule(true);
    rule.from.valueSets = ['someValueSet'];

    expect(rule.toFSH()).toBe('* include codes from valueset someValueSet');
  });

  it('should export a ValueSetFilterComponentRule with codes from several valuesets', () => {
    const rule = new ExportableValueSetFilterComponentRule(true);
    rule.from.valueSets = ['someValueSet', 'otherValueSet'];

    expect(rule.toFSH()).toBe('* include codes from valueset someValueSet and otherValueSet');
  });

  it('should export a ValueSetFilterComponentRule with codes from a system and several valuesets', () => {
    const rule = new ExportableValueSetFilterComponentRule(true);
    rule.from.system = 'someSystem';
    rule.from.valueSets = ['someValueSet', 'otherValueSet'];

    expect(rule.toFSH()).toBe(
      '* include codes from system someSystem and valueset someValueSet and otherValueSet'
    );
  });

  it('should export a ValueSetFilterComponentRule with codes from a system that are filtered', () => {
    const rule = new ExportableValueSetFilterComponentRule(true);
    rule.from.system = 'someSystem';
    rule.filters.push({ property: 'version', operator: fshtypes.VsOperator.EQUALS, value: '2.0' });

    expect(rule.toFSH()).toBe('* include codes from system someSystem where version = "2.0"');
  });

  it('should export a ValueSetFilterComponentRule with codes from a system that are filtered with regex', () => {
    const rule = new ExportableValueSetFilterComponentRule(true);
    rule.from.system = 'someSystem';
    rule.filters.push({
      property: 'version',
      operator: fshtypes.VsOperator.REGEX,
      value: /2.0/
    });

    expect(rule.toFSH()).toBe('* include codes from system someSystem where version regex /2.0/');
  });

  it('should export a ValueSetFilterComponentRule with codes from a system that are filtered with code', () => {
    const rule = new ExportableValueSetFilterComponentRule(true);
    rule.from.system = 'someSystem';
    rule.filters.push({
      property: 'version',
      operator: fshtypes.VsOperator.IS_A,
      value: new FshCode('foo')
    });

    expect(rule.toFSH()).toBe('* include codes from system someSystem where version is-a #foo');
  });

  it('should export a ValueSetFilterComponentRule with codes from a system that are filtered with boolean', () => {
    const rule = new ExportableValueSetFilterComponentRule(true);
    rule.from.system = 'someSystem';
    rule.filters.push({
      property: 'version',
      operator: fshtypes.VsOperator.EXISTS,
      value: true
    });

    expect(rule.toFSH()).toBe('* include codes from system someSystem where version exists true');
  });

  it('should export a ValueSetFilterComponentRule with codes from a system that are multi-filtered', () => {
    const rule = new ExportableValueSetFilterComponentRule(true);
    rule.from.system = 'someSystem';
    rule.filters.push({ property: 'version', operator: fshtypes.VsOperator.EQUALS, value: '2.0' });
    rule.filters.push({ property: 'status', operator: fshtypes.VsOperator.EXISTS, value: true });

    expect(rule.toFSH()).toBe(
      '* include codes from system someSystem where version = "2.0" and status exists true'
    );
  });
});
