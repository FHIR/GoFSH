import { fshtypes } from 'fsh-sushi';
import { EOL } from 'os';
import {
  ExportableValueSetConceptComponentRule,
  ExportableValueSetFilterComponentRule
} from '../../src/exportable';

const { FshCode } = fshtypes;

describe('ExportableValueSetConceptComponentRule', () => {
  it('should export a ValueSetConceptComponentRule with a single concept', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts.push(new fshtypes.FshCode('foo', 'bar'));

    expect(rule.toFSH()).toBe('* bar#foo');
  });

  it('should export a ValueSetConceptComponentRule with a single excluded concept', () => {
    const rule = new ExportableValueSetConceptComponentRule(false);
    rule.concepts.push(new fshtypes.FshCode('foo', 'bar'));

    expect(rule.toFSH()).toBe('* exclude bar#foo');
  });

  it('should export a ValueSetConceptComponentRule with a single concept with system and display', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts.push(new fshtypes.FshCode('foo', 'bar', 'baz'));

    expect(rule.toFSH()).toBe('* bar#foo "baz"');
  });

  it('should export a ValueSetConceptComponentRule with a concept from a system', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts.push(new fshtypes.FshCode('foo'));
    rule.from.system = 'someSystem';

    expect(rule.toFSH()).toBe('* someSystem#foo');
  });

  it('should export a ValueSetConceptComponentRule with several concepts included from a system', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts.push(new fshtypes.FshCode('foo'));
    rule.concepts.push(new fshtypes.FshCode('bar'));
    rule.from.system = 'someSystem';

    expect(rule.toFSH()).toBe(`* someSystem#foo${EOL}* someSystem#bar`);
  });

  it('should export a ValueSetConceptComponentRule with several concepts excluded from a system', () => {
    const rule = new ExportableValueSetConceptComponentRule(false);
    rule.concepts.push(new fshtypes.FshCode('foo'));
    rule.concepts.push(new fshtypes.FshCode('bar'));
    rule.from.system = 'someSystem';

    expect(rule.toFSH()).toBe(`* exclude someSystem#foo${EOL}* exclude someSystem#bar`);
  });

  it('should export a ValueSetConceptComponentRule with a concept included from a valueset', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts.push(new fshtypes.FshCode('foo', 'bar'));
    rule.from.valueSets = ['someValueSet'];

    expect(rule.toFSH()).toBe('* include bar#foo from valueset someValueSet');
  });

  it('should export a ValueSetConceptComponentRule with a concept excluded from a valueset', () => {
    const rule = new ExportableValueSetConceptComponentRule(false);
    rule.concepts.push(new fshtypes.FshCode('foo', 'bar'));
    rule.from.valueSets = ['someValueSet'];

    expect(rule.toFSH()).toBe('* exclude bar#foo from valueset someValueSet');
  });

  it('should export a ValueSetConceptComponentRule with a concept included from several valuesets', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts.push(new fshtypes.FshCode('foo', 'bar'));
    rule.from.valueSets = ['someValueSet', 'otherValueSet'];

    expect(rule.toFSH()).toBe('* include bar#foo from valueset someValueSet and otherValueSet');
  });

  it('should export a ValueSetConceptComponentRule with a concept excluded from several valuesets', () => {
    const rule = new ExportableValueSetConceptComponentRule(false);
    rule.concepts.push(new fshtypes.FshCode('foo', 'bar'));
    rule.from.valueSets = ['someValueSet', 'otherValueSet'];

    expect(rule.toFSH()).toBe('* exclude bar#foo from valueset someValueSet and otherValueSet');
  });

  it('should export a ValueSetConceptComponentRule with a concept included from a system and several valuesets', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts.push(new fshtypes.FshCode('foo'));
    rule.from.system = 'someSystem';
    rule.from.valueSets = ['someValueSet', 'otherValueSet'];

    expect(rule.toFSH()).toBe(
      '* include #foo from system someSystem and valueset someValueSet and otherValueSet'
    );
  });

  it('should export a ValueSetConceptComponentRule with a concept excluded from a system and several valuesets', () => {
    const rule = new ExportableValueSetConceptComponentRule(false);
    rule.concepts.push(new fshtypes.FshCode('foo'));
    rule.from.system = 'someSystem';
    rule.from.valueSets = ['someValueSet', 'otherValueSet'];

    expect(rule.toFSH()).toBe(
      '* exclude #foo from system someSystem and valueset someValueSet and otherValueSet'
    );
  });
});

describe('ExportableValueSetFilterComponentRule', () => {
  it('should export a ValueSetFilterComponentRule with codes from a system', () => {
    const rule = new ExportableValueSetFilterComponentRule(true);
    rule.from.system = 'someSystem';

    expect(rule.toFSH()).toBe('* include codes from system someSystem');
  });

  it('should export a ValueSetFilterComponentRule that excludes codes from a system', () => {
    const rule = new ExportableValueSetFilterComponentRule(false);
    rule.from.system = 'someSystem';

    expect(rule.toFSH()).toBe('* exclude codes from system someSystem');
  });

  it('should export a ValueSetFilterComponentRule with codes from a valueset', () => {
    const rule = new ExportableValueSetFilterComponentRule(true);
    rule.from.valueSets = ['someValueSet'];

    expect(rule.toFSH()).toBe('* include codes from valueset someValueSet');
  });

  it('should export a ValueSetFilterComponentRule that excludes codes from a valueset', () => {
    const rule = new ExportableValueSetFilterComponentRule(false);
    rule.from.valueSets = ['someValueSet'];

    expect(rule.toFSH()).toBe('* exclude codes from valueset someValueSet');
  });

  it('should export a ValueSetFilterComponentRule with codes from several valuesets', () => {
    const rule = new ExportableValueSetFilterComponentRule(true);
    rule.from.valueSets = ['someValueSet', 'otherValueSet'];

    expect(rule.toFSH()).toBe('* include codes from valueset someValueSet and otherValueSet');
  });

  it('should export a ValueSetFilterComponentRule that excludes codes from several valuesets', () => {
    const rule = new ExportableValueSetFilterComponentRule(false);
    rule.from.valueSets = ['someValueSet', 'otherValueSet'];

    expect(rule.toFSH()).toBe('* exclude codes from valueset someValueSet and otherValueSet');
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

  it('should export a ValueSetFilterComponentRule that excludes codes from a system that are filtered', () => {
    const rule = new ExportableValueSetFilterComponentRule(false);
    rule.from.system = 'someSystem';
    rule.filters.push({ property: 'version', operator: fshtypes.VsOperator.EQUALS, value: '2.0' });

    expect(rule.toFSH()).toBe('* exclude codes from system someSystem where version = "2.0"');
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

  it('should export a ValueSetFilterComponentRule that excludes codes from a system that are filtered with regex', () => {
    const rule = new ExportableValueSetFilterComponentRule(false);
    rule.from.system = 'someSystem';
    rule.filters.push({
      property: 'version',
      operator: fshtypes.VsOperator.REGEX,
      value: /2.0/
    });

    expect(rule.toFSH()).toBe('* exclude codes from system someSystem where version regex /2.0/');
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

  it('should export a ValueSetFilterComponentRule that excludes codes from a system that are filtered with code', () => {
    const rule = new ExportableValueSetFilterComponentRule(false);
    rule.from.system = 'someSystem';
    rule.filters.push({
      property: 'version',
      operator: fshtypes.VsOperator.IS_A,
      value: new FshCode('foo')
    });

    expect(rule.toFSH()).toBe('* exclude codes from system someSystem where version is-a #foo');
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

  it('should export a ValueSetFilterComponentRule that excludes codes from a system that are filtered with boolean', () => {
    const rule = new ExportableValueSetFilterComponentRule(false);
    rule.from.system = 'someSystem';
    rule.filters.push({
      property: 'version',
      operator: fshtypes.VsOperator.EXISTS,
      value: true
    });

    expect(rule.toFSH()).toBe('* exclude codes from system someSystem where version exists true');
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

  it('should export a ValueSetFilterComponentRule that excludes codes from a system that are multi-filtered', () => {
    const rule = new ExportableValueSetFilterComponentRule(false);
    rule.from.system = 'someSystem';
    rule.filters.push({ property: 'version', operator: fshtypes.VsOperator.EQUALS, value: '2.0' });
    rule.filters.push({ property: 'status', operator: fshtypes.VsOperator.EXISTS, value: true });

    expect(rule.toFSH()).toBe(
      '* exclude codes from system someSystem where version = "2.0" and status exists true'
    );
  });

  it('should format a long ValueSetConceptComponentRule to take up multiple lines', () => {
    const rule = new ExportableValueSetConceptComponentRule(true);
    rule.concepts = [
      new FshCode('cookies', undefined, 'Cookies'),
      new FshCode('candy', undefined, 'Candy'),
      new FshCode('chips', undefined, 'Chips'),
      new FshCode('cakes', undefined, 'Cakes'),
      new FshCode('verylargecakes', undefined, 'Very Large Cakes')
    ];
    rule.from.system = 'http://fhir.food-pyramid.org/FoodPyramidGuide/CodeSystems/FoodGroupsCS';
    rule.from.valueSets = ['http://fhir.food-pyramid.org/FoodPyramidGuide/ValueSets/DeliciousVS'];

    const result = rule.toFSH();
    const expectedResult = [
      '* include #cookies "Cookies" and',
      '    #candy "Candy" and',
      '    #chips "Chips" and',
      '    #cakes "Cakes" and',
      '    #verylargecakes "Very Large Cakes"',
      '    from system http://fhir.food-pyramid.org/FoodPyramidGuide/CodeSystems/FoodGroupsCS and',
      '    valueset http://fhir.food-pyramid.org/FoodPyramidGuide/ValueSets/DeliciousVS'
    ].join(EOL);
    expect(result).toEqual(expectedResult);
  });

  it('should format a long ValueSetFilterComponentRule to take up multiple lines', () => {
    const rule = new ExportableValueSetFilterComponentRule(false);
    rule.from.system = 'http://fhir.example.org/myImplementationGuide/CodeSystem/AppleCS';
    rule.from.valueSets = [
      'http://fhir.example.org/myImplementationGuide/ValueSet/BananaVS',
      'http://fhir.example.org/myImplementationGuide/ValueSet/CupcakeVS'
    ];
    rule.filters.push({
      property: 'display',
      operator: fshtypes.VsOperator.EQUALS,
      value: 'this and that'
    });
    rule.filters.push({ property: 'version', operator: fshtypes.VsOperator.EXISTS, value: true });
    rule.filters.push({
      property: 'concept',
      operator: fshtypes.VsOperator.DESCENDENT_OF,
      value: new FshCode('comestible')
    });

    const result = rule.toFSH();
    const expectedResult = [
      '* exclude codes from system http://fhir.example.org/myImplementationGuide/CodeSystem/AppleCS and',
      '    valueset http://fhir.example.org/myImplementationGuide/ValueSet/BananaVS and',
      '    http://fhir.example.org/myImplementationGuide/ValueSet/CupcakeVS',
      '    where display = "this and that" and',
      '    version exists true and',
      '    concept descendent-of #comestible'
    ].join(EOL);
    expect(result).toEqual(expectedResult);
  });
});
