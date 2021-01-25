import { fshtypes } from 'fsh-sushi';
import { EOL } from 'os';
import {
  ExportableProfile,
  ExportableCardRule,
  ExportableFlagRule,
  ExportableBindingRule,
  ExportableObeysRule,
  ExportableOnlyRule,
  ExportableAssignmentRule
} from '../../src/exportable';

describe('ExportableProfile', () => {
  it('should export the simplest profile', () => {
    const input = new ExportableProfile('SimpleProfile');

    const expectedResult = ['Profile: SimpleProfile', 'Id: SimpleProfile'].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a profile with additional metadata', () => {
    const input = new ExportableProfile('MyObservation');
    input.parent = 'Observation';
    input.id = 'my-observation';
    input.title = 'My Observation';
    input.description = 'My profile on Observation.';

    const expectedResult = [
      'Profile: MyObservation',
      'Parent: Observation',
      'Id: my-observation',
      'Title: "My Observation"',
      'Description: "My profile on Observation."'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a profile with metadata that contains characters that are escaped in FSH', () => {
    const input = new ExportableProfile('NewlineProfile');
    input.id = 'newline-profile';
    input.title = 'This title\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';
    input.description =
      'This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';

    const expectedResult = [
      'Profile: NewlineProfile',
      'Id: newline-profile',
      'Title: "This title\\nhas a newline in it. Is that \\\\not allowed\\\\? Is that \\"not okay\\"?"',
      'Description: """This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?"""'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export a profile with rules', () => {
    const input = new ExportableProfile('MyPatient');
    input.parent = 'Patient';

    const cardRule = new ExportableCardRule('name');
    cardRule.min = 2;
    cardRule.max = '8';
    input.rules.push(cardRule);

    const flagRule = new ExportableFlagRule('active');
    flagRule.mustSupport = true;
    flagRule.summary = true;
    input.rules.push(flagRule);

    const bindingRule = new ExportableBindingRule('maritalStatus');
    bindingRule.valueSet = 'http://example.org/ValueSet/MaritalStatus';
    bindingRule.strength = 'required';
    input.rules.push(bindingRule);

    const obeysRule = new ExportableObeysRule('contact');
    obeysRule.keys = ['myp-1'];
    input.rules.push(obeysRule);

    const expectedResult = [
      'Profile: MyPatient',
      'Parent: Patient',
      'Id: MyPatient',
      '* name 2..8',
      '* active MS SU',
      '* maritalStatus from http://example.org/ValueSet/MaritalStatus (required)',
      '* contact obeys myp-1'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should call switchQuantityRules upon export', () => {
    const childObservation = new ExportableProfile('ChildObservation');
    childObservation.parent = 'Observation';
    childObservation.id = 'child-observation';

    const onlyRule = new ExportableOnlyRule('value[x]');
    onlyRule.types = [{ type: 'Quantity' }];
    childObservation.rules.push(onlyRule);

    const unitRule = new ExportableAssignmentRule('valueQuantity.unit');
    unitRule.value = 'lb';
    childObservation.rules.push(unitRule);

    const statusRule = new ExportableAssignmentRule('status');
    statusRule.value = new fshtypes.FshCode('preliminary');
    childObservation.rules.push(statusRule);

    const quantityRule = new ExportableAssignmentRule('valueQuantity');
    quantityRule.value = new fshtypes.FshQuantity(82, new fshtypes.FshCode('[lb_av]'));
    childObservation.rules.push(quantityRule);

    const expectedResult = [
      'Profile: ChildObservation',
      'Parent: Observation',
      'Id: child-observation',
      '* value[x] only Quantity',
      "* valueQuantity = 82 '[lb_av]'",
      '* valueQuantity.unit = "lb"',
      '* status = #preliminary',
      ''
    ].join(EOL);
    const result = childObservation.toFSH();
    expect(result).toBe(expectedResult);
  });
});
