import { ProfileExporter } from '../../src/export';
import { Profile } from 'fsh-sushi/dist/fshtypes';
import { EOL } from 'os';

describe('ProfileExporter', () => {
  let exporter: ProfileExporter;

  beforeAll(() => {
    exporter = new ProfileExporter();
  });

  it('should export the simplest profile', () => {
    const input = new Profile('SimpleProfile');

    const expectedResult = ['Profile: SimpleProfile', 'Id: SimpleProfile'].join(EOL);
    const result = exporter.export(input);
    expect(result).toBe(expectedResult);
  });

  it('should export a profile with additional metadata', () => {
    const input = new Profile('MyObservation');
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
    const result = exporter.export(input);
    expect(result).toBe(expectedResult);
  });

  it('should export a profile with metadata that contains characters that are escaped in FSH', () => {
    const input = new Profile('NewlineProfile');
    input.id = 'newline-profile';
    input.description =
      'This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';

    const expectedResult = [
      'Profile: NewlineProfile',
      'Id: newline-profile',
      'Description: "This description\\nhas a newline in it. Is that \\\\not allowed\\\\? Is that \\"not okay\\"?"'
    ].join(EOL);
    const result = exporter.export(input);
    expect(result).toBe(expectedResult);
  });
});
