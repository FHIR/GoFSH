import { EOL } from 'os';
import { ExportableResource } from '../../src/exportable';

describe('ExportableResource', () => {
  it('should export the simplest Resource', () => {
    const input = new ExportableResource('SimpleResource');
    const expectedResult = ['Resource: SimpleResource', 'Id: SimpleResource'].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a Resource with additional metadata', () => {
    const input = new ExportableResource('MyResource');
    input.parent = 'DomainResource';
    input.id = 'my-resource';
    input.title = 'My Resource';
    input.description = 'This is my resource.';
    const expectedResult = [
      'Resource: MyResource',
      // NOTE: Since parent is DomainResource, it is omitted from FSH
      'Id: my-resource',
      'Title: "My Resource"',
      'Description: "This is my resource."'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a Resource with additional metadata without including DomainResource url as parent', () => {
    const input = new ExportableResource('MyResource');
    input.parent = 'http://hl7.org/fhir/StructureDefinition/DomainResource';
    input.id = 'my-resource';
    input.title = 'My Resource';
    input.description = 'This is my Resource.';
    const expectedResult = [
      'Resource: MyResource',
      // NOTE: Since parent is the url for DomainResource, it is omitted from FSH
      'Id: my-resource',
      'Title: "My Resource"',
      'Description: "This is my Resource."'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a Resource that extends another Resource', () => {
    const input = new ExportableResource('MyResource');
    input.parent = 'DifferentResource';
    input.id = 'my-resource';
    input.title = 'My Resource';
    input.description = 'This is my Resource.';
    const expectedResult = [
      'Resource: MyResource',
      'Parent: DifferentResource',
      'Id: my-resource',
      'Title: "My Resource"',
      'Description: "This is my Resource."'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });
});
