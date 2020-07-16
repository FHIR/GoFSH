import path from 'path';
import { StructureDefinition } from 'fsh-sushi/dist/fhirtypes';
import { FHIRDefinitions, loadFromPath } from 'fsh-sushi/dist/fhirdefs';
import { ProfileProcessor } from '../../src/processor';
import { Profile } from 'fsh-sushi/dist/fshtypes';

describe('ProfileProcessor', () => {
  let processor: ProfileProcessor;
  let defs: FHIRDefinitions;

  beforeAll(() => {
    processor = new ProfileProcessor();
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, 'fixtures'), 'testpackage', defs);
  });

  it('should convert the simplest Profile', () => {
    const input = StructureDefinition.fromJSON(defs.fishForFHIR('SimpleProfile'));
    const result = processor.process(input);
    expect(result).toBeInstanceOf(Profile);
    expect(result.name).toBe('SimpleProfile');
  });

  it('should convert a Profile with simple metadata', () => {
    // simple metadata fields are Id, Title, and Description
    const input = StructureDefinition.fromJSON(defs.fishForFHIR('MyProfile'));
    const result = processor.process(input);
    expect(result).toBeInstanceOf(Profile);
    expect(result.name).toBe('MyProfile');
    expect(result.id).toBe('my-profile');
    expect(result.title).toBe('My New Profile');
    expect(result.description).toBe('This is my new Profile. Thank you.');
  });
});
