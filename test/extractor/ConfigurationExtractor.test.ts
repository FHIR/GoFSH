import { cloneDeep } from 'lodash';
import { fshtypes } from 'fsh-sushi';
import { ConfigurationExtractor } from '../../src/extractor';
import { Package } from '../../src/processor';
import {
  ExportableProfile,
  ExportableCaretValueRule,
  ExportableExtension,
  ExportableValueSet,
  ExportableCodeSystem,
  ExportableConfiguration
} from '../../src/exportable';

describe('ConfigurationExtractor', () => {
  let resources: Package;

  beforeAll(() => {
    resources = new Package();
    const typicalProfile = new ExportableProfile('TypicalProfile');
    const profileUrl = new ExportableCaretValueRule('');
    profileUrl.caretPath = 'url';
    profileUrl.value = 'http://example.org/our/ig/StructureDefinition/TypicalProfile';
    typicalProfile.rules.push(profileUrl);

    const typicalExtension = new ExportableExtension('TypicalExtension');
    const extensionUrl = cloneDeep(profileUrl);
    extensionUrl.value = 'http://example.org/our/ig/StructureDefinition/TypicalExtension';
    const extensionStatus = new ExportableCaretValueRule('');
    extensionStatus.caretPath = 'status';
    extensionStatus.value = new fshtypes.FshCode('draft');
    const extensionVersion = new ExportableCaretValueRule('');
    extensionVersion.caretPath = 'version';
    extensionVersion.value = '0.8.6';
    const extensionFhirVersion = new ExportableCaretValueRule('');
    extensionFhirVersion.caretPath = 'fhirVersion';
    extensionFhirVersion.value = '4.0.1';
    typicalExtension.rules.push(extensionUrl, extensionStatus, extensionVersion);

    const typicalValueSet = new ExportableValueSet('TypicalVS');
    const valueSetUrl = cloneDeep(profileUrl);
    valueSetUrl.value = 'http://example.org/our/ig/ValueSet/TypicalVS';
    typicalValueSet.rules.push(
      valueSetUrl,
      cloneDeep(extensionStatus),
      cloneDeep(extensionVersion),
      cloneDeep(extensionFhirVersion)
    );

    const typicalCodeSystem = new ExportableCodeSystem('TypicalCodes');
    const codeSystemUrl = cloneDeep(profileUrl);
    codeSystemUrl.value = 'http://example.org/our/ig/CodeSystem/TypicalCodes';
    const codeSystemStatus = cloneDeep(extensionStatus);
    codeSystemStatus.value = new fshtypes.FshCode('active');
    typicalCodeSystem.rules.push(
      codeSystemUrl,
      codeSystemStatus,
      cloneDeep(extensionVersion),
      cloneDeep(extensionFhirVersion)
    );

    resources.add(typicalProfile);
    resources.add(typicalExtension);
    resources.add(typicalValueSet);
    resources.add(typicalCodeSystem);
  });

  describe('#process', () => {
    it('should return a configuration with default canonical and fhirVersion when there are no resources', () => {
      const emptyResources = new Package();
      const result = ConfigurationExtractor.process(emptyResources);
      expect(result.config.canonical).toBe('http://sample.org');
      expect(result.config.fhirVersion).toEqual(['4.0.1']);
    });

    it('should return a configuration with elements inferred from the canonical', () => {
      const result = ConfigurationExtractor.process(resources);
      expect(result.config.canonical).toBe('http://example.org/our/ig');
      expect(result.config.id).toBe('example.our.ig');
      expect(result.config.name).toBe('ExampleOurIg');
    });

    it('should return a configuration with elements inferred from resources', () => {
      const result = ConfigurationExtractor.process(resources);
      expect(result.config.fhirVersion).toEqual(['4.0.1']);
      expect(result.config.version).toBe('0.8.6');
      expect(result.config.status).toBe('draft');
    });
  });

  describe('#inferCanonical', () => {
    it('should return an empty string when the input contains no resources', () => {
      const emptyResources = new Package();
      const result = ConfigurationExtractor.inferCanonical(emptyResources);
      expect(result).toBe('');
    });

    it('should return an empty string when none of the resources have a defined url', () => {
      const noUrlResources = cloneDeep(resources);
      // replace the rules that set a url with some empty rules
      const differentRule = new ExportableCaretValueRule('');
      differentRule.caretPath = 'publisher';
      differentRule.value = 'Somebody';
      noUrlResources.profiles[0].rules[0] = differentRule;
      noUrlResources.extensions[0].rules[0] = cloneDeep(differentRule);
      noUrlResources.valueSets[0].rules[0] = cloneDeep(differentRule);
      noUrlResources.codeSystems[0].rules[0] = cloneDeep(differentRule);
      const result = ConfigurationExtractor.inferCanonical(noUrlResources);
      expect(result).toBe('');
    });

    it('should use the common url base to determine the canonical when all resources have the same url base', () => {
      const result = ConfigurationExtractor.inferCanonical(resources);
      expect(result).toBe('http://example.org/our/ig');
    });

    it('should use the most frequent url base to determine the canonical when not all resources have the same url base', () => {
      const differentResources = cloneDeep(resources);
      const differentProfile = new ExportableProfile('DifferentProfile');
      const differentUrl = new ExportableCaretValueRule('');
      differentUrl.caretPath = 'url';
      differentUrl.value = 'http://example.org/different/ig/StructureDefinition/DifferentProfile';
      differentProfile.rules.push(differentUrl);
      differentResources.add(differentProfile);
      const result = ConfigurationExtractor.inferCanonical(differentResources);

      expect(result).toBe('http://example.org/our/ig');
    });
  });

  describe('#inferNameAndId', () => {
    it('should return an empty object when the canonical does not match the standard format', () => {
      const config = new ExportableConfiguration({
        canonical: 'http://bad-canonical',
        fhirVersion: []
      });
      const result = ConfigurationExtractor.inferNameAndId(config);
      expect(result).toEqual({});
    });

    it('should return a name and id when the canonical has a two-part host and no path', () => {
      const config = new ExportableConfiguration({
        canonical: 'https://example.org',
        fhirVersion: []
      });
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'Example',
        id: 'example'
      });

      config.config.canonical = 'http://example.org/';
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'Example',
        id: 'example'
      });
    });

    it('should return a name and id when the canonical has a two-part host and a non-empty path', () => {
      const config = new ExportableConfiguration({
        canonical: 'https://example.org/first',
        fhirVersion: []
      });
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'ExampleFirst',
        id: 'example.first'
      });

      config.config.canonical = 'https://example.org/first/';
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'ExampleFirst',
        id: 'example.first'
      });

      config.config.canonical = 'https://example.org/first/second';
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'ExampleFirstSecond',
        id: 'example.first.second'
      });

      config.config.canonical = 'http://example.org/first/second/';
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'ExampleFirstSecond',
        id: 'example.first.second'
      });
    });

    it('should return a name and id when the canonical has a three-part host and no path', () => {
      const config = new ExportableConfiguration({
        canonical: 'http://www.example.org',
        fhirVersion: []
      });
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'Example',
        id: 'example'
      });

      config.config.canonical = 'https://www.example.org/';
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'Example',
        id: 'example'
      });

      config.config.canonical = 'https://fhir.example.org';
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'FhirExample',
        id: 'fhir.example'
      });

      config.config.canonical = 'http://fhir.example.org/';
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'FhirExample',
        id: 'fhir.example'
      });
    });

    it('should return a name and id when the canonical has a three-part host and a non-empty path', () => {
      const config = new ExportableConfiguration({
        canonical: 'http://www.example.org/orange/apple',
        fhirVersion: []
      });
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'ExampleOrangeApple',
        id: 'example.orange.apple'
      });

      config.config.canonical = 'https://www.example.org/orange/apple/banana';
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'ExampleOrangeAppleBanana',
        id: 'example.orange.apple.banana'
      });

      config.config.canonical = 'https://fhir.example.org/orange/apple/banana';
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'FhirExampleOrangeAppleBanana',
        id: 'fhir.example.orange.apple.banana'
      });

      config.config.canonical = 'http://fhir.example.org/orange/apple/banana/pear';
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'FhirExampleOrangeAppleBananaPear',
        id: 'fhir.example.orange.apple.banana.pear'
      });
    });

    it('should return a name and id when the canonical has a four or more-part host and no path', () => {
      const config = new ExportableConfiguration({
        canonical: 'http://www.crate.fruit.org',
        fhirVersion: []
      });
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'CrateFruit',
        id: 'crate.fruit'
      });

      config.config.canonical = 'https://www.example.co.uk/';
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'Example',
        id: 'example'
      });
    });

    it('should return a name and id when the canonical has a four or more-part host and a non-empty path', () => {
      const config = new ExportableConfiguration({
        canonical: 'http://www.crate.fruit.org/orange/apple',
        fhirVersion: []
      });
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'CrateFruitOrangeApple',
        id: 'crate.fruit.orange.apple'
      });

      config.config.canonical = 'https://www.example.co.uk/orange/apple/banana';
      expect(ConfigurationExtractor.inferNameAndId(config)).toEqual({
        name: 'ExampleOrangeAppleBanana',
        id: 'example.orange.apple.banana'
      });
    });
  });

  describe('#inferString', () => {
    it('should return the most common string for the specified caret path', () => {
      const result = ConfigurationExtractor.inferString(resources, 'version');
      expect(result).toBe('0.8.6');
    });

    it('should return the most common code for the specified caret path when it refers to a FshCode', () => {
      const result = ConfigurationExtractor.inferString(resources, 'status');
      expect(result).toBe('draft');
    });
  });
});
