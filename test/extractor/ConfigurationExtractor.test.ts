import path from 'path';
import fs from 'fs';
import { cloneDeep } from 'lodash';
import { ImplementationGuideDependsOn } from 'fsh-sushi/dist/fhirtypes';
import { loggerSpy } from '../helpers/loggerSpy';
import { ConfigurationExtractor } from '../../src/extractor';
import { ExportableCaretValueRule, ExportableConfiguration } from '../../src/exportable';

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

  beforeEach(() => {
    loggerSpy.reset();
  });

  describe('#process', () => {
    it('should return a configuration with default canonical and fhirVersion when there are no resources', () => {
      const emptyResources: any[] = [];
      const result = ConfigurationExtractor.process(emptyResources);
      expect(result.config.canonical).toBe('http://example.org');
      expect(result.config.fhirVersion).toEqual(['4.0.1']);
      expect(result.config.FSHOnly).toBe(true);
      expect(result.config.applyExtensionMetadataToRoot).toBe(false);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
    });

    it('should be able to handle a specified FHIR version', () => {
      const ig = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-ig.json'), 'utf-8')
      );
      const result = ConfigurationExtractor.process([ig, ...resources], '5.0.0');
      expect(result.config.fhirVersion).toEqual(['5.0.0']);
    });

    it('should be able to handle a specified FHIR version when FHIR version is missing', () => {
      const ig = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'missing-fhir-version-ig.json'), 'utf-8')
      );
      const result = ConfigurationExtractor.process([ig, ...resources], '5.0.0');
      expect(result.config.fhirVersion).toEqual(['5.0.0']);
    });

    it('should log an error when the specified FHIR version is different from detected FHIR version', () => {
      const ig = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-ig.json'), 'utf-8')
      );
      const result = ConfigurationExtractor.process([ig, ...resources], '5.0.0');
      expect(result.config.fhirVersion).toEqual(['5.0.0']);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        'FHIR Version mismatch error: specified version is: 5.0.0 while detected version is: 4.5.0'
      );
    });

    describe('non-IG resources', () => {
      it('should return a configuration with elements inferred from the canonical', () => {
        const result = ConfigurationExtractor.process(resources);
        expect(result.config.canonical).toBe('http://example.org/our/ig');
        expect(result.config.id).toBe('example.our.ig');
        expect(result.config.name).toBe('ExampleOurIg');
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      });

      it('should return a configuration with elements inferred from resources', () => {
        const result = ConfigurationExtractor.process(resources);
        expect(result.config.fhirVersion).toEqual(['4.0.1']);
        expect(result.config.version).toBe('0.8.6');
        expect(result.config.status).toBe('draft');
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      });
    });

    describe('IG resource', () => {
      it('should create a Configuration from an ImplementationGuide with url and fhirVersion properties', () => {
        const ig = JSON.parse(
          fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-ig.json'), 'utf-8')
        );
        const result = ConfigurationExtractor.process([ig, ...resources]);
        expect(result).toBeInstanceOf(ExportableConfiguration);
        expect(result.config.canonical).toBe('http://example.org/tests'); // From IG
        expect(result.config.fhirVersion).toEqual(['4.5.0']); // From IG
        expect(result.config.FSHOnly).toBe(true);
        expect(result.config.applyExtensionMetadataToRoot).toBe(false);
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      });

      it('should create a Configuration with an inferred url form an ImplementationGuide missing a url', () => {
        const ig = JSON.parse(
          fs.readFileSync(path.join(__dirname, 'fixtures', 'missing-url-ig.json'), 'utf-8')
        );
        const result = ConfigurationExtractor.process([ig, ...resources]);
        expect(result).toBeInstanceOf(ExportableConfiguration);
        expect(result.config.canonical).toBe('http://example.org/our/ig'); // Inferred from resources
        expect(result.config.fhirVersion).toEqual(['4.0.1']);
        expect(result.config.FSHOnly).toBe(true);
        expect(result.config.applyExtensionMetadataToRoot).toBe(false);
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /ImplementationGuide missing properties.*url/s
        );
      });

      it('should create a Configuration with an inferred fhirVersion from an ImplementationGuide missing a fhirVersion', () => {
        const ig = JSON.parse(
          fs.readFileSync(path.join(__dirname, 'fixtures', 'missing-fhir-version-ig.json'), 'utf-8')
        );
        const result = ConfigurationExtractor.process([ig, ...resources]);
        expect(result).toBeInstanceOf(ExportableConfiguration);
        expect(result.config.canonical).toBe('http://example.org/tests'); // From IG
        expect(result.config.fhirVersion).toEqual(['4.0.1']); // Inferred from resources
        expect(result.config.FSHOnly).toBe(true);
        expect(result.config.applyExtensionMetadataToRoot).toBe(false);
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /ImplementationGuide missing properties.*fhirVersion/s
        );
      });

      it('should default to 4.0.1 when no supported fhirVersion is given', () => {
        const ig = JSON.parse(
          fs.readFileSync(
            path.join(__dirname, 'fixtures', 'unsupported-fhir-version-ig.json'),
            'utf-8'
          )
        );
        const result = ConfigurationExtractor.process([ig]);
        expect(result).toBeInstanceOf(ExportableConfiguration);
        expect(result.config.canonical).toBe('http://example.org/tests'); // From IG
        expect(result.config.fhirVersion).toEqual(['4.0.1']); // Default
        expect(result.config.FSHOnly).toBe(true);
        expect(result.config.applyExtensionMetadataToRoot).toBe(false);
        expect(loggerSpy.getLastMessage('warn')).toMatch(
          /ImplementationGuide missing properties.*fhirVersion/s
        );
        expect(loggerSpy.getMessageAtIndex(-2, 'warn')).toMatch(/Unsupported fhirVersion 99\.0\.0/);
      });

      it('should create a Configuration with additional properties', () => {
        const ig = JSON.parse(
          fs.readFileSync(path.join(__dirname, 'fixtures', 'bigger-ig.json'), 'utf-8')
        );

        const testDependencies: ImplementationGuideDependsOn[] = [
          {
            version: '3.1.0',
            packageId: 'hl7.fhir.us.core',
            uri: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core'
          },
          {
            version: '1.0.0',
            packageId: 'hl7.fhir.us.mcode',
            uri: 'http://hl7.org/fhir/us/mcode/ImplementationGuide/hl7.fhir.us.mcode'
          }
        ];

        const result = ConfigurationExtractor.process([ig, ...resources]);
        expect(result).toBeInstanceOf(ExportableConfiguration);
        expect(result.config.canonical).toBe('http://example.org/tests');
        expect(result.config.fhirVersion).toEqual(['4.0.1']);
        expect(result.config.id).toBe('bigger.ig');
        expect(result.config.name).toBe('BiggerImplementationGuideForTesting');
        expect(result.config.status).toBe('active');
        expect(result.config.version).toBe('0.12');
        expect(result.config.dependencies).toEqual(testDependencies);
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      });
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

    it('should not include hl7 and fhir in the name when the canonical starts with http://hl7.org/fhir/', () => {
      const canonical = 'http://hl7.org/fhir/us/core';
      expect(ConfigurationExtractor.inferNameAndId(canonical)).toEqual({
        name: 'UsCore',
        id: 'hl7.fhir.us.core'
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
