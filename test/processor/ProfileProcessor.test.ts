import path from 'path';
import fs from 'fs-extra';
import { ProfileProcessor } from '../../src/processor';
import { ExportableProfile } from '../../src/exportable';

describe('ProfileProcessor', () => {
  describe('#extractKeywords', () => {
    it('should convert the simplest Profile', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input);
      expect(result).toBeInstanceOf(ExportableProfile);
      expect(result.name).toBe('SimpleProfile');
    });

    it('should convert a Profile with simple metadata', () => {
      // simple metadata fields are Id, Title, and Description
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input);
      expect(result).toBeInstanceOf(ExportableProfile);
      expect(result.name).toBe('MyProfile');
      expect(result.id).toBe('my-profile');
      expect(result.title).toBe('My New Profile');
      expect(result.description).toBe('This is my new Profile. Thank you.');
    });

    it('should not convert a Profile without a name', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input);
      expect(result).toBeUndefined();
    });
  });

  describe('#extractRules', () => {
    it('should convert a Profile with rules', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input);
      expect(result.rules.length).toBe(1);
    });
  });

  it('should convert a profile that has a baseDefinition', () => {
    // the baseDefinition field defines a Profile's Parent
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'big-profile.json'), 'utf-8')
    );
    const result = ProfileProcessor.process(input);
    expect(result).toBeInstanceOf(ExportableProfile);
    expect(result.name).toBe('BigProfile');
    expect(result.parent).toBe('https://demo.org/StructureDefinition/SmallProfile');
  });
});
