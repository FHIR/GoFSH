import path from 'path';
import fs from 'fs-extra';
import { fhirdefs } from 'fsh-sushi';
import { ExtensionProcessor } from '../../src/processor';
import { ExportableExtension } from '../../src/exportable';
import '../helpers/loggerSpy'; // suppresses console logging

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
      const expectedExtension = new ExportableExtension('SimpleExtension');
      const result = ExtensionProcessor.process(input, defs);

      expect(result).toContainEqual<ExportableExtension>(expectedExtension);
    });

    it('should convert an Extension with simple metadata', () => {
      // simple metadata fields are Id, Title, and Description
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-extension.json'), 'utf-8')
      );
      const expectedExtension = new ExportableExtension('MyExtension');
      expectedExtension.id = 'my-extension';
      expectedExtension.title = 'My New Extension';
      expectedExtension.description = 'This is my new Extension. Thank you.';
      const result = ExtensionProcessor.process(input, defs);

      expect(result).toContainEqual<ExportableExtension>(expectedExtension);
    });

    it('should not convert an Extension without a name', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-extension.json'), 'utf-8')
      );
      const result = ExtensionProcessor.process(input, defs);
      expect(result).toHaveLength(0);
    });
  });

  describe('#extractRules', () => {
    it('should convert an Extension with rules', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-extension.json'), 'utf-8')
      );
      const result = ExtensionProcessor.process(input, defs);
      const extension = result.find(
        resource => resource instanceof ExportableExtension
      ) as ExportableExtension;
      expect(extension.rules.length).toBe(1);
    });
  });
});
