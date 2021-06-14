import { EOL } from 'os';
import { ExportableLogical } from '../../src/exportable';

describe('ExportableLogical', () => {
  it('should export the simplest Logical', () => {
    const input = new ExportableLogical('SimpleLogical');
    const expectedResult = ['Logical: SimpleLogical', 'Id: SimpleLogical'].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a Logical with additional metadata', () => {
    const input = new ExportableLogical('MyLogical');
    input.parent = 'Base';
    input.id = 'my-logical';
    input.title = 'My Logical';
    input.description = 'This is my logical model.';
    const expectedResult = [
      'Logical: MyLogical',
      // NOTE: Since parent is Base, it is omitted from FSH
      'Id: my-logical',
      'Title: "My Logical"',
      'Description: "This is my logical model."'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a Logical with additional metadata without including Base url as parent', () => {
    const input = new ExportableLogical('MyLogical');
    input.parent = 'http://hl7.org/fhir/StructureDefinition/Base';
    input.id = 'my-logical';
    input.title = 'My Logical';
    input.description = 'This is my logical model.';
    const expectedResult = [
      'Logical: MyLogical',
      // NOTE: Since parent is the url for Base, it is omitted from FSH
      'Id: my-logical',
      'Title: "My Logical"',
      'Description: "This is my logical model."'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a Logical that extends another Logical', () => {
    const input = new ExportableLogical('MyLogical');
    input.parent = 'DifferentLogical';
    input.id = 'my-logical';
    input.title = 'My Logical';
    input.description = 'This is my logical model.';
    const expectedResult = [
      'Logical: MyLogical',
      'Parent: DifferentLogical',
      'Id: my-logical',
      'Title: "My Logical"',
      'Description: "This is my logical model."'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });
});
