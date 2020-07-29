import { ExportableConceptRule } from '../../src/exportable';

describe('ExportableConceptRule', () => {
  it('should export a ConceptRule with only code', () => {
    const rule = new ExportableConceptRule('foo');

    const expectedResult = '* #foo';
    const result = rule.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a ConceptRule with code and display', () => {
    const rule = new ExportableConceptRule('foo');
    rule.display = 'bar';

    const expectedResult = '* #foo "bar"';
    const result = rule.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a ConceptRule with code, display, and definition', () => {
    const rule = new ExportableConceptRule('foo');
    rule.display = 'bar';
    rule.definition = 'baz';

    const expectedResult = '* #foo "bar" "baz"';
    const result = rule.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a ConceptRule with code and definition', () => {
    const rule = new ExportableConceptRule('foo');
    rule.definition = 'baz';

    const expectedResult = '* #foo """baz"""';
    const result = rule.toFSH();
    expect(result).toBe(expectedResult);
  });
});
