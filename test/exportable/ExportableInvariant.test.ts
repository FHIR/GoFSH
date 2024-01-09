import { EOL } from 'os';
import { fshtypes } from 'fsh-sushi';
import { ExportableInvariant } from '../../src/exportable';

describe('ExportableInvariant', () => {
  it('should export the simplest invariant', () => {
    const input = new ExportableInvariant('inv-1');

    const expectedResult = 'Invariant: inv-1';
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export an invariant with additional metadata', () => {
    const input = new ExportableInvariant('inv-2');
    input.description = 'This is an important condition.';
    input.severity = new fshtypes.FshCode('error');
    input.expression = 'requirement.exists()';
    input.xpath = 'f:requirement';

    const expectedResult = [
      'Invariant: inv-2',
      'Description: "This is an important condition."',
      '* severity = #error',
      '* expression = "requirement.exists()"',
      '* xpath = "f:requirement"'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export an invariant with metadata that contains characters that are escaped in FSH', () => {
    const input = new ExportableInvariant('inv-3');
    input.description = 'Please do this.\nPlease always do this with a \\ character.';
    input.severity = new fshtypes.FshCode('warning');
    input.expression = 'requirement.contains("\\")';
    input.xpath = 'f:requirement';

    const expectedResult = [
      'Invariant: inv-3',
      'Description: """Please do this.\nPlease always do this with a \\ character."""',
      '* severity = #warning',
      '* expression = "requirement.contains(\\"\\\\\\")"',
      '* xpath = "f:requirement"'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });
});
