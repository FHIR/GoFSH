import { EOL } from 'os';
import { ExportableInstance } from '../../src/exportable';

describe('ExportableInstance', () => {
  it('should export the simplest Instance', () => {
    const i = new ExportableInstance('MyInstance');
    i.instanceOf = 'Patient';

    const expectedResult = ['Instance: MyInstance', 'InstanceOf: Patient', 'Usage: #example'].join(
      EOL
    );
    expect(i.toFSH()).toBe(expectedResult);
  });

  it('should export an instance with additional metadata', () => {
    const i = new ExportableInstance('MyInstance');
    i.instanceOf = 'Patient';
    i.title = 'My Patient Title';
    i.description = 'My Patient Description';

    const expectedResult = [
      'Instance: MyInstance',
      'InstanceOf: Patient',
      'Title: "My Patient Title"',
      'Description: "My Patient Description"',
      'Usage: #example'
    ].join(EOL);
    expect(i.toFSH()).toBe(expectedResult);
  });
});
