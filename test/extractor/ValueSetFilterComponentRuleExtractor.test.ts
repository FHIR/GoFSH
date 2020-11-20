import { fhirtypes, fshtypes } from 'fsh-sushi';
import { ValueSetFilterComponentRuleExtractor } from '../../src/extractor';
import { ExportableValueSetFilterComponentRule } from '../../src/exportable';
import { ProcessableValueSet } from '../../src/processor';
import { loggerSpy } from '../helpers';

// We need to pass this in to ever call, but it's only used when logging an error message
const VALUESET: ProcessableValueSet = { id: 'test-vs' };

describe('ValueSetFilterComponentRuleExtractor', () => {
  it('should extract a filter rule that includes all codes from a system', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = { system: 'http://loinc.org' };
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, true);
    const expectedFilter = new ExportableValueSetFilterComponentRule(true);
    expectedFilter.from = { system: 'http://loinc.org' };
    expect(filter).toEqual(expectedFilter);
  });

  it('should extract a filter rule that excludes all codes from a system', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = { system: 'http://loinc.org' };
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, false);
    const expectedFilter = new ExportableValueSetFilterComponentRule(false);
    expectedFilter.from = { system: 'http://loinc.org' };
    expect(filter).toEqual(expectedFilter);
  });

  it('should extract a filter rule that includes all codes from a system with a version', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = {
      system: 'http://loinc.org',
      version: '12345'
    };
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, true);
    const expectedFilter = new ExportableValueSetFilterComponentRule(true);
    expectedFilter.from = { system: 'http://loinc.org|12345' };
    expect(filter).toEqual(expectedFilter);
  });

  it('should extract a filter rule that includes all codes from a valueset', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = {
      valueSet: ['http://example.org/ValueSet/FooVS']
    };
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, true);
    const expectedFilter = new ExportableValueSetFilterComponentRule(true);
    expectedFilter.from = { valueSets: ['http://example.org/ValueSet/FooVS'] };
    expect(filter).toEqual(expectedFilter);
  });

  it('should extract a filter rule that excludes all codes from a valueset', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = {
      valueSet: ['http://example.org/ValueSet/FooVS']
    };
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, false);
    const expectedFilter = new ExportableValueSetFilterComponentRule(false);
    expectedFilter.from = { valueSets: ['http://example.org/ValueSet/FooVS'] };
    expect(filter).toEqual(expectedFilter);
  });

  it('should extract a filter rule that includes all codes from multiple valuesets', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = {
      valueSet: ['http://example.org/ValueSet/FooVS', 'http://example.org/ValueSet/BarVS']
    };
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, true);
    const expectedFilter = new ExportableValueSetFilterComponentRule(true);
    expectedFilter.from = {
      valueSets: ['http://example.org/ValueSet/FooVS', 'http://example.org/ValueSet/BarVS']
    };
    expect(filter).toEqual(expectedFilter);
  });

  it('should extract a filter rule with one filter', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = { system: 'http://mycodesystem.org' };
    input.filter = [{ property: 'a', op: '=', value: 'b' }];
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, true);
    const expectedFilter = new ExportableValueSetFilterComponentRule(true);
    expectedFilter.from = { system: 'http://mycodesystem.org' };
    expectedFilter.filters = [{ property: 'a', operator: fshtypes.VsOperator.EQUALS, value: 'b' }];
    expect(filter).toEqual(expectedFilter);
  });

  it('should extract an excluded filter rule with one filter', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = { system: 'http://mycodesystem.org' };
    input.filter = [{ property: 'a', op: '=', value: 'b' }];
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, false);
    const expectedFilter = new ExportableValueSetFilterComponentRule(false);
    expectedFilter.from = { system: 'http://mycodesystem.org' };
    expectedFilter.filters = [{ property: 'a', operator: fshtypes.VsOperator.EQUALS, value: 'b' }];
    expect(filter).toEqual(expectedFilter);
  });

  it('should extract a filter rule with multiple filters', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = { system: 'http://mycodesystem.org' };
    input.filter = [
      { property: 'a', op: '=', value: 'b' },
      { property: 'c', op: '=', value: 'd' }
    ];
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, true);
    const expectedFilter = new ExportableValueSetFilterComponentRule(true);
    expectedFilter.from = { system: 'http://mycodesystem.org' };
    expectedFilter.filters = [
      { property: 'a', operator: fshtypes.VsOperator.EQUALS, value: 'b' },
      { property: 'c', operator: fshtypes.VsOperator.EQUALS, value: 'd' }
    ];
    expect(filter).toEqual(expectedFilter);
  });

  it('should extract string-based filter rules', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = { system: 'http://mycodesystem.org' };
    input.filter = [
      { property: 'a', op: '=', value: 'b' },
      { property: 'c', op: 'in', value: 'd' },
      { property: 'e', op: 'not-in', value: 'f' }
    ];
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, true);
    const expectedFilter = new ExportableValueSetFilterComponentRule(true);
    expectedFilter.from = { system: 'http://mycodesystem.org' };
    expectedFilter.filters = [
      { property: 'a', operator: fshtypes.VsOperator.EQUALS, value: 'b' },
      { property: 'c', operator: fshtypes.VsOperator.IN, value: 'd' },
      { property: 'e', operator: fshtypes.VsOperator.NOT_IN, value: 'f' }
    ];
    expect(filter).toEqual(expectedFilter);
  });

  it('should extract code-based filter rules', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = { system: 'http://mycodesystem.org' };
    input.filter = [
      { property: 'a', op: 'is-a', value: 'b' },
      { property: 'c', op: 'descendent-of', value: 'd' },
      { property: 'e', op: 'is-not-a', value: 'f' },
      { property: 'g', op: 'generalizes', value: 'h' }
    ];
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, true);
    const expectedFilter = new ExportableValueSetFilterComponentRule(true);
    expectedFilter.from = { system: 'http://mycodesystem.org' };
    expectedFilter.filters = [
      { property: 'a', operator: fshtypes.VsOperator.IS_A, value: new fshtypes.FshCode('b') },
      {
        property: 'c',
        operator: fshtypes.VsOperator.DESCENDENT_OF,
        value: new fshtypes.FshCode('d')
      },
      { property: 'e', operator: fshtypes.VsOperator.IS_NOT_A, value: new fshtypes.FshCode('f') },
      { property: 'g', operator: fshtypes.VsOperator.GENERALIZES, value: new fshtypes.FshCode('h') }
    ];
    expect(filter).toEqual(expectedFilter);
  });

  it('should extract regex-based filter rules', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = { system: 'http://mycodesystem.org' };
    input.filter = [{ property: 'a', op: 'regex', value: 'b' }];
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, true);
    const expectedFilter = new ExportableValueSetFilterComponentRule(true);
    expectedFilter.from = { system: 'http://mycodesystem.org' };
    expectedFilter.filters = [
      { property: 'a', operator: fshtypes.VsOperator.REGEX, value: new RegExp('b') }
    ];
    expect(filter).toEqual(expectedFilter);
  });

  it('should extract boolean-based filter rules', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = { system: 'http://mycodesystem.org' };
    input.filter = [
      { property: 'a', op: 'exists', value: 'true' },
      { property: 'c', op: 'exists', value: 'false' }
    ];
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, true);
    const expectedFilter = new ExportableValueSetFilterComponentRule(true);
    expectedFilter.from = { system: 'http://mycodesystem.org' };
    expectedFilter.filters = [
      { property: 'a', operator: fshtypes.VsOperator.EXISTS, value: true },
      { property: 'c', operator: fshtypes.VsOperator.EXISTS, value: false }
    ];
    expect(filter).toEqual(expectedFilter);
  });

  it('should log an error for an unknown operator and treat it as a string-based rule', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = { system: 'http://mycodesystem.org' };
    input.filter = [{ property: 'a', op: 'begets', value: 'b' }];
    loggerSpy.reset();
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, false);
    expect(loggerSpy.getLastMessage('error')).toBe(
      'Unsupported filter operator in ValueSet test-vs: begets'
    );
    const expectedFilter = new ExportableValueSetFilterComponentRule(false);
    expectedFilter.from = { system: 'http://mycodesystem.org' };
    expectedFilter.filters = [
      { property: 'a', operator: 'begets' as fshtypes.VsOperator, value: 'b' }
    ];
    expect(filter).toEqual(expectedFilter);
  });

  it('should not extract anything from a concept component', () => {
    const input: fhirtypes.ValueSetComposeIncludeOrExclude = {
      system: 'http://loinc.org',
      concept: [{ code: 'a' }]
    };
    const filter = ValueSetFilterComponentRuleExtractor.process(input, VALUESET, true);
    expect(filter).toBeUndefined();
  });
});
