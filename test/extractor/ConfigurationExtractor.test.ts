import { ConfigurationExtractor } from '../../src/extractor';
import { Package } from '../../src/processor';
import {
  ExportableProfile,
  ExportableCaretValueRule,
  ExportableExtension,
  ExportableValueSet,
  ExportableCodeSystem
} from '../../src/exportable';
import { cloneDeep } from 'lodash';

describe('ConfigurationExtractor', () => {
  describe('#process', () => {
    it('should return a configuration with a canonical and default fhirVersion when there are no resources', () => {
      const emptyResources = new Package();
      const result = ConfigurationExtractor.process(emptyResources);
      expect(result.config.canonical).toBeDefined();
      expect(result.config.fhirVersion).toEqual(['4.0.1']);
    });
  });

  describe('#inferCanonical', () => {
    let resources: Package;

    beforeAll(() => {
      resources = new Package();
      const typicalProfile = new ExportableProfile('TypicalProfile');
      const profileUrl = new ExportableCaretValueRule('');
      profileUrl.caretPath = 'url';
      profileUrl.value = 'http://example.org/our-ig/StructureDefinition/TypicalProfile';
      typicalProfile.rules.push(profileUrl);
      const typicalExtension = new ExportableExtension('TypicalExtension');
      const extensionUrl = cloneDeep(profileUrl);
      extensionUrl.value = 'http://example.org/our-ig/StructureDefinition/TypicalExtension';
      typicalExtension.rules.push(extensionUrl);
      const typicalValueSet = new ExportableValueSet('TypicalVS');
      const valueSetUrl = cloneDeep(profileUrl);
      valueSetUrl.value = 'http://example.org/our-ig/ValueSet/TypicalVS';
      typicalValueSet.rules.push(valueSetUrl);
      const typicalCodeSystem = new ExportableCodeSystem('TypicalCodes');
      const codeSystemUrl = cloneDeep(profileUrl);
      codeSystemUrl.value = 'http://example.org/our-ig/CodeSystem/TypicalCodes';
      typicalCodeSystem.rules.push(codeSystemUrl);
      resources.add(typicalProfile);
      resources.add(typicalExtension);
      resources.add(typicalValueSet);
      resources.add(typicalCodeSystem);
    });

    it('should return an empty string when the input contains no resources', () => {
      const emptyResources = new Package();
      const canonical = ConfigurationExtractor.inferCanonical(emptyResources);
      expect(canonical).toBe('');
    });

    it('should use the common url base to determine the canonical when all resources have the same url base', () => {
      const result = ConfigurationExtractor.inferCanonical(resources);
      expect(result).toBe('http://example.org/our-ig');
    });

    it('should use the most frequent url base to determine the canonical when not all resources have the same url base', () => {
      const differentResources = cloneDeep(resources);
      const differentProfile = new ExportableProfile('DifferentProfile');
      const differentUrl = new ExportableCaretValueRule('');
      differentUrl.caretPath = 'url';
      differentUrl.value = 'http://example.org/different-ig/StructureDefinition/DifferentProfile';
      differentProfile.rules.push(differentUrl);
      differentResources.add(differentProfile);
      const result = ConfigurationExtractor.inferCanonical(differentResources);

      expect(result).toBe('http://example.org/our-ig');
    });
  });
});
