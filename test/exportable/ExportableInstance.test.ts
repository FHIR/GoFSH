import { EOL } from 'os';
import { ExportableInstance, ExportableAssignmentRule } from '../../src/exportable';

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

  it('should export an instance with assignment rules', () => {
    const exInstance = new ExportableInstance('MyInstance');
    exInstance.instanceOf = 'Observation';

    const statusRule = new ExportableAssignmentRule('status');
    statusRule.value = 'final';
    exInstance.rules.push(statusRule);

    const dateRule = new ExportableAssignmentRule('effectiveDateTime');
    dateRule.value = '2019-04-01';
    exInstance.rules.push(dateRule);

    const expectedResult = [
      'Instance: MyInstance',
      'InstanceOf: Observation',
      'Usage: #example',
      '* status = "final"',
      '* effectiveDateTime = "2019-04-01"'
    ].join(EOL);
    expect(exInstance.toFSH()).toBe(expectedResult);
  });
});
