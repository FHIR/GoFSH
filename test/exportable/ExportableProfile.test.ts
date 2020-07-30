import { EOL } from 'os';
import {
  ExportableProfile,
  ExportableCardRule,
  ExportableFlagRule,
  ExportableValueSetRule
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
    input.description =
      'This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';

    const expectedResult = [
      'Profile: NewlineProfile',
      'Id: newline-profile',
      'Description: "This description\\nhas a newline in it. Is that \\\\not allowed\\\\? Is that \\"not okay\\"?"'
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

    const valueSetRule = new ExportableValueSetRule('maritalStatus');
    valueSetRule.valueSet = 'http://example.org/ValueSet/MaritalStatus';
    valueSetRule.strength = 'required';
    input.rules.push(valueSetRule);

    const expectedResult = [
      'Profile: MyPatient',
      'Parent: Patient',
      'Id: MyPatient',
      '* name 2..8',
      '* active MS SU',
      '* maritalStatus from http://example.org/ValueSet/MaritalStatus (required)'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });
});
