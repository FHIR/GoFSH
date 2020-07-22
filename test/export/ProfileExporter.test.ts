import { ProfileExporter } from '../../src/export';
import { Profile } from 'fsh-sushi/dist/fshtypes';
import { CardRule } from 'fsh-sushi/dist/fshtypes/rules';
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

  describe('#cardRule', () => {
    let profile: Profile;

    beforeEach(() => {
      profile = new Profile('MyPatient');
      profile.parent = 'Patient';
      profile.id = null;
    });

    it('should export a profile with a CardRule with a min and a max', () => {
      const nameRule = new CardRule('name');
      nameRule.min = 2;
      nameRule.max = '8';
      profile.rules.push(nameRule);

      const expectedResult = ['Profile: MyPatient', 'Parent: Patient', '* name 2..8'].join(EOL);
      const result = exporter.export(profile);
      expect(result).toBe(expectedResult);
    });

    it('should export a profile with a CardRule with only a min', () => {
      const photoRule = new CardRule('photo');
      photoRule.min = 3;
      profile.rules.push(photoRule);

      const expectedResult = ['Profile: MyPatient', 'Parent: Patient', '* photo 3..'].join(EOL);
      const result = exporter.export(profile);
      expect(result).toBe(expectedResult);
    });

    it('should export a profile with a CardRule with only a max', () => {
      const contactRule = new CardRule('contact');
      contactRule.max = '5';
      profile.rules.push(contactRule);

      const expectedResult = ['Profile: MyPatient', 'Parent: Patient', '* contact ..5'].join(EOL);
      const result = exporter.export(profile);
      expect(result).toBe(expectedResult);
    });

    it('should export a profile with multiple CardRules', () => {
      const nameRule = new CardRule('name');
      nameRule.min = 2;
      nameRule.max = '8';
      const contactRule = new CardRule('contact');
      contactRule.max = '5';
      profile.rules.push(nameRule, contactRule);

      const expectedResult = [
        'Profile: MyPatient',
        'Parent: Patient',
        '* name 2..8',
        '* contact ..5'
      ].join(EOL);
      const result = exporter.export(profile);
      expect(result).toBe(expectedResult);
    });
  });
});
