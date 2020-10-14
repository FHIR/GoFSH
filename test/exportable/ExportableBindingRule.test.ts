import { ExportableBindingRule } from '../../src/exportable';

describe('ExportableBindingRule', () => {
  it('should export a profile with a BindingRule', () => {
    const rule = new ExportableBindingRule('valueCodeableConcept');
    rule.valueSet = 'http://example.org/ValueSet/Foo';
    rule.strength = 'required';

    const expectedResult = '* valueCodeableConcept from http://example.org/ValueSet/Foo (required)';
    const result = rule.toFSH();
    expect(result).toBe(expectedResult);
  });
});
