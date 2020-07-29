import { EOL } from 'os';
import { ExportableCodeSystem, ExportableConceptRule } from '../../src/exportable';

describe('ExportableCodeSystem', () => {
  it('should export the simplest CodeSystem', () => {
    const input = new ExportableCodeSystem('SimpleCodeSystem');

    const expectedResult = ['CodeSystem: SimpleCodeSystem', 'Id: SimpleCodeSystem'].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a CodeSystem with additional metadata', () => {
    const input = new ExportableCodeSystem('MetaCodeSystem');
    input.id = 'meta-code-system';
    input.title = 'Meta CodeSystem';
    input.description = 'This is a CodeSystem with some metadata.';

    const expectedResult = [
      'CodeSystem: MetaCodeSystem',
      'Id: meta-code-system',
      'Title: "Meta CodeSystem"',
      'Description: "This is a CodeSystem with some metadata."'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a CodeSystem with metadata that contains characters that are escaped in FSH', () => {
    const input = new ExportableCodeSystem('NewlineCodeSystem');
    input.id = 'newline-code-system';
    input.description =
      'This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';

    const expectedResult = [
      'CodeSystem: NewlineCodeSystem',
      'Id: newline-code-system',
      'Description: "This description\\nhas a newline in it. Is that \\\\not allowed\\\\? Is that \\"not okay\\"?"'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a CodeSystem with rules', () => {
    const input = new ExportableCodeSystem('MyCodeSystem');
    const conceptRule1 = new ExportableConceptRule('foo');
    conceptRule1.display = 'bar';
    conceptRule1.definition = 'baz';
    input.rules.push(conceptRule1);
    const conceptRule2 = new ExportableConceptRule('oof');
    conceptRule2.display = 'rab';
    conceptRule2.definition = 'zab';
    input.rules.push(conceptRule2);

    const expectedResult = [
      'CodeSystem: MyCodeSystem',
      'Id: MyCodeSystem',
      '* #foo "bar" "baz"',
      '* #oof "rab" "zab"'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });
});
