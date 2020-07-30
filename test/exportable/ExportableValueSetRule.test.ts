import { ExportableValueSetRule } from '../../src/exportable';

describe('ExportableValueSetRule', () => {
  it('should export a profile with a ValueSetRule', () => {
    const rule = new ExportableValueSetRule('valueCodeableConcept');
    rule.valueSet = 'http://example.org/ValueSet/Foo';
    rule.strength = 'required';

    const expectedResult = '* valueCodeableConcept from http://example.org/ValueSet/Foo (required)';
    const result = rule.toFSH();
    expect(result).toBe(expectedResult);
  });
});
