import { EOL } from 'os';
import { ExportableValueSet } from '../../src/exportable';

describe('ExportableValueSet', () => {
  it('should export the simplest ValueSet', () => {
    const input = new ExportableValueSet('SimpleValueSet');

    const expectedResult = ['ValueSet: SimpleValueSet', 'Id: SimpleValueSet'].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a ValueSet with additional metadata', () => {
    const input = new ExportableValueSet('MetaValueSet');
    input.id = 'meta-value-set';
    input.title = 'Meta ValueSet';
    input.description = 'This is a ValueSet with some metadata.';

    const expectedResult = [
      'ValueSet: MetaValueSet',
      'Id: meta-value-set',
      'Title: "Meta ValueSet"',
      'Description: "This is a ValueSet with some metadata."'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a ValueSet with metadata that contains characters that are escaped in FSH', () => {
    const input = new ExportableValueSet('NewlineValueSet');
    input.id = 'newline-value-set';
    input.description =
      'This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';

    const expectedResult = [
      'ValueSet: NewlineValueSet',
      'Id: newline-value-set',
      'Description: "This description\\nhas a newline in it. Is that \\\\not allowed\\\\? Is that \\"not okay\\"?"'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });
});
