import { cloneDeep } from 'lodash';
import { ConfigurationExtractor } from '../../src/extractor';
import { ExportableCaretValueRule } from '../../src/exportable';

describe('ConfigurationExtractor', () => {
  let resources: any[];

  beforeAll(() => {
    const typicalProfile = {
      resourceType: 'StructureDefinition',
      type: 'Resource',
      name: 'TypicalProfile',
      url: 'http://example.org/our/ig/StructureDefinition/TypicalProfile'
    };
    const typicalExtension = {
      resourceType: 'StructureDefinition',
      type: 'Extension',
      name: 'TypicalExtension',
      url: 'http://example.org/our/ig/StructureDefinition/TypicalExtension',
      status: 'draft',
      version: '0.8.6',
      fhirVersion: '4.0.1'
    };
    const typicalValueSet = {
      resourceType: 'ValueSet',
      name: 'TypicalValueSet',
      url: 'http://example.org/our/ig/ValueSet/TypicalVS',
      status: 'draft',
      version: '0.8.6',
      fhirVersion: '4.0.1'
    };
    const typicalCodeSystem = {
      resourceType: 'ValueSet',
      name: 'TypicalValueSet',
      url: 'http://example.org/our/ig/CodeSystem/TypicalCodes',
      status: 'active',
      version: '0.8.6',
      fhirVersion: '4.0.1'
    };
    resources = [typicalProfile, typicalExtension, typicalValueSet, typicalCodeSystem];
  });

  describe('#process', () => {
    it('should return a configuration with default canonical and fhirVersion when there are no resources', () => {
      const emptyResources: any[] = [];
      const result = ConfigurationExtractor.process(emptyResources);
      expect(result.config.canonical).toBe('http://sample.org');
      expect(result.config.fhirVersion).toEqual(['4.0.1']);
      expect(result.config.FSHOnly).toBe(true);
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
      const result = ConfigurationExtractor.inferCanonical([]);
      expect(result).toBe('');
    });

    it('should return an empty string when none of the resources have a defined url', () => {
      const noUrlResources = cloneDeep(resources);
      // replace the rules that set a url with some empty rules
      const differentRule = new ExportableCaretValueRule('');
      differentRule.caretPath = 'publisher';
      differentRule.value = 'Somebody';
      delete noUrlResources[0].url;
      delete noUrlResources[1].url;
      delete noUrlResources[2].url;
      delete noUrlResources[3].url;
      const result = ConfigurationExtractor.inferCanonical(noUrlResources);
      expect(result).toBe('');
    });

    it('should use the common url base to determine the canonical when all resources have the same url base', () => {
      const result = ConfigurationExtractor.inferCanonical(resources);
      expect(result).toBe('http://example.org/our/ig');
    });

    it('should use the most frequent url base to determine the canonical when not all resources have the same url base', () => {
      const differentResources = cloneDeep(resources);
      differentResources.push({
        resourceType: 'StructureDefinition',
        type: 'Resource',
        name: 'DifferentProfile',
        url: 'http://example.org/different/ig/StructureDefinition/DifferentProfile'
      });
      const result = ConfigurationExtractor.inferCanonical(differentResources);

      expect(result).toBe('http://example.org/our/ig');
    });
  });

  describe('#inferNameAndId', () => {
    it('should return an empty object when the canonical does not match the standard format', () => {
      const canonical = 'http://bad-canonical';
      const result = ConfigurationExtractor.inferNameAndId(canonical);
      expect(result).toEqual({});
    });

    it('should return a name and id when the canonical has a two-part host and no path', () => {
      let canonical = 'https://example.org';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'Example',
        id: 'example'
      });

      canonical = 'http://example.org/';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'Example',
        id: 'example'
      });
    });

    it('should return a name and id when the canonical has a two-part host and a non-empty path', () => {
      let canonical = 'https://example.org/first';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'ExampleFirst',
        id: 'example.first'
      });

      canonical = 'https://example.org/first/';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'ExampleFirst',
        id: 'example.first'
      });

      canonical = 'https://example.org/first/second';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'ExampleFirstSecond',
        id: 'example.first.second'
      });

      canonical = 'http://example.org/first/second/';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'ExampleFirstSecond',
        id: 'example.first.second'
      });
    });

    it('should return a name and id when the canonical has a three-part host and no path', () => {
      let canonical = 'http://www.example.org';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'Example',
        id: 'example'
      });

      canonical = 'https://www.example.org/';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'Example',
        id: 'example'
      });

      canonical = 'https://fhir.example.org';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'FhirExample',
        id: 'fhir.example'
      });

      canonical = 'http://fhir.example.org/';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'FhirExample',
        id: 'fhir.example'
      });
    });

    it('should return a name and id when the canonical has a three-part host and a non-empty path', () => {
      let canonical = 'http://www.example.org/orange/apple';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'ExampleOrangeApple',
        id: 'example.orange.apple'
      });

      canonical = 'https://www.example.org/orange/apple/banana';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'ExampleOrangeAppleBanana',
        id: 'example.orange.apple.banana'
      });

      canonical = 'https://fhir.example.org/orange/apple/banana';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'FhirExampleOrangeAppleBanana',
        id: 'fhir.example.orange.apple.banana'
      });

      canonical = 'http://fhir.example.org/orange/apple/banana/pear';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'FhirExampleOrangeAppleBananaPear',
        id: 'fhir.example.orange.apple.banana.pear'
      });
    });

    it('should return a name and id when the canonical has a four or more-part host and no path', () => {
      let canonical = 'http://www.crate.fruit.org';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'CrateFruit',
        id: 'crate.fruit'
      });

      canonical = 'https://www.example.co.uk/';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'Example',
        id: 'example'
      });
    });

    it('should return a name and id when the canonical has a four or more-part host and a non-empty path', () => {
      let canonical = 'http://www.crate.fruit.org/orange/apple';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'CrateFruitOrangeApple',
        id: 'crate.fruit.orange.apple'
      });

      canonical = 'https://www.example.co.uk/orange/apple/banana';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'ExampleOrangeAppleBanana',
        id: 'example.orange.apple.banana'
      });
    });

    it('should not include hl7 and fhir in the name and id when the canonical starts with http://hl7.org/fhir/', () => {
      const canonical = 'http://hl7.org/fhir/us/core';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'UsCore',
        id: 'us.core'
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
