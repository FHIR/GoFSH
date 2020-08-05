import path from 'path';
import fs from 'fs-extra';
import { StructureDefinition } from 'fsh-sushi/dist/fhirtypes';
import { ProfileProcessor } from '../../src/processor';
import { ExportableProfile } from '../../src/exportable';

describe('ProfileProcessor', () => {
  let processor: ProfileProcessor;

  beforeAll(() => {
    processor = new ProfileProcessor();
  });

  it('should convert the simplest Profile', () => {
    const input = StructureDefinition.fromJSON(
      JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-profile.json'), 'utf-8'))
    );
    const result = processor.process(input);
    expect(result).toBeInstanceOf(ExportableProfile);
    expect(result.name).toBe('SimpleProfile');
  });

  it('should convert a Profile with simple metadata', () => {
    // simple metadata fields are Id, Title, and Description
    const input = StructureDefinition.fromJSON(
      JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-profile.json'), 'utf-8')
      )
    );
    const result = processor.process(input);
    expect(result).toBeInstanceOf(ExportableProfile);
    expect(result.name).toBe('MyProfile');
    expect(result.id).toBe('my-profile');
    expect(result.title).toBe('My New Profile');
    expect(result.description).toBe('This is my new Profile. Thank you.');
  });

  it('should convert a profile that has a baseDefinition', () => {
    // the baseDefinition field defines a Profile's Parent
    const input = StructureDefinition.fromJSON(
      JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'big-profile.json'), 'utf-8'))
    );
    const result = processor.process(input);
    expect(result).toBeInstanceOf(ExportableProfile);
    expect(result.name).toBe('BigProfile');
    expect(result.parent).toBe('https://demo.org/StructureDefinition/SmallProfile');
  });
});
