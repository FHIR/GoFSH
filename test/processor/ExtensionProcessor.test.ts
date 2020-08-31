import path from 'path';
import fs from 'fs-extra';
import { fhirdefs } from 'fsh-sushi';
import { ExtensionProcessor } from '../../src/processor';
import { ExportableExtension } from '../../src/exportable';

describe('ExtensionProcessor', () => {
  let defs: fhirdefs.FHIRDefinitions;

  beforeAll(() => {
    defs = new fhirdefs.FHIRDefinitions();
    fhirdefs.loadFromPath(path.join(__dirname, '..', 'utils', 'testdefs'), 'testPackage', defs);
  });

  describe('#extractKeywords', () => {
    it('should convert the simplest Extension', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-extension.json'), 'utf-8')
      );
      const result = ExtensionProcessor.process(input, defs);
      expect(result).toBeInstanceOf(ExportableExtension);
      expect(result.name).toBe('SimpleExtension');
    });

    it('should convert an Extension with simple metadata', () => {
      // simple metadata fields are Id, Title, and Description
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-extension.json'), 'utf-8')
      );
      const result = ExtensionProcessor.process(input, defs);
      expect(result).toBeInstanceOf(ExportableExtension);
      expect(result.name).toBe('MyExtension');
      expect(result.id).toBe('my-extension');
      expect(result.title).toBe('My New Extension');
      expect(result.description).toBe('This is my new Extension. Thank you.');
    });

    it('should not convert an Extension without a name', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-extension.json'), 'utf-8')
      );
      const result = ExtensionProcessor.process(input, defs);
      expect(result).toBeUndefined();
    });
  });

  describe('#extractRules', () => {
    it('should convert an Extension with rules', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-extension.json'), 'utf-8')
      );
      const result = ExtensionProcessor.process(input, defs);
      expect(result.rules.length).toBe(1);
    });
  });
});
