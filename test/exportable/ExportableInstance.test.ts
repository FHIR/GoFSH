import { fshtypes } from 'fsh-sushi';
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
    const statusCode = new fshtypes.FshCode('final');
    statusRule.value = statusCode;
    exInstance.rules.push(statusRule);

    const dateRule = new ExportableAssignmentRule('effectiveDateTime');
    dateRule.value = '2019-04-01';
    exInstance.rules.push(dateRule);

    const expectedResult = [
      'Instance: MyInstance',
      'InstanceOf: Observation',
      'Usage: #example',
      '* status = #final',
      '* effectiveDateTime = "2019-04-01"'
    ].join(EOL);
    expect(exInstance.toFSH()).toBe(expectedResult);
  });

  it('should call switchQuantityRules upon export', () => {
    const testObservation = new ExportableInstance('TestObservation');
    testObservation.instanceOf = 'Observation';

    const unitRule = new ExportableAssignmentRule('valueQuantity.unit');
    unitRule.value = 'lb';
    testObservation.rules.push(unitRule);

    const statusRule = new ExportableAssignmentRule('status');
    statusRule.value = new fshtypes.FshCode('preliminary');
    testObservation.rules.push(statusRule);

    const quantityRule = new ExportableAssignmentRule('valueQuantity');
    quantityRule.value = new fshtypes.FshQuantity(82, new fshtypes.FshCode('[lb_av]'));
    testObservation.rules.push(quantityRule);

    const expectedResult = [
      'Instance: TestObservation',
      'InstanceOf: Observation',
      'Usage: #example',
      "* valueQuantity = 82 '[lb_av]'",
      '* valueQuantity.unit = "lb"',
      '* status = #preliminary',
      ''
    ].join(EOL);
    const result = testObservation.toFSH();
    expect(result).toBe(expectedResult);
  });
});
