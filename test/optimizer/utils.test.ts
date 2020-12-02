import path from 'path';
import { utils } from 'fsh-sushi';
import '../helpers/loggerSpy'; // side-effect: suppresses logs
import { MasterFisher } from '../../src/utils';
import { loadTestDefinitions, stockLake } from '../helpers';
import { optimizeURL, resolveAliasFromURL, resolveURL } from '../../src/optimizer/utils';
import { ExportableAlias } from '../../src/exportable';

describe('optimizer', () => {
  describe('#optimizeURL', () => {
    let fisher: utils.Fishable;

    beforeAll(() => {
      const defs = loadTestDefinitions();
      const lake = stockLake(path.join(__dirname, 'plugins', 'fixtures', 'small-profile.json'));
      fisher = new MasterFisher(lake, defs);
    });

    it('should prefer to resolve the URL to a FHIR resource', () => {
      const result = optimizeURL(
        'https://demo.org/StructureDefinition/Patient',
        [],
        [utils.Type.Resource, utils.Type.Profile, utils.Type.Extension],
        fisher
      );
      expect(result).toBe('Patient');
    });

    it('should resolve the URL to an alias and add that alias if the URL cannot be resolved', () => {
      const aliases: ExportableAlias[] = [];
      const result = optimizeURL(
        'https://not-resolved/StructureDefinition/Patient',
        aliases,
        [utils.Type.Resource, utils.Type.Profile, utils.Type.Extension],
        fisher
      );
      expect(result).toBe('$Patient');
      expect(aliases).toEqual([
        { alias: '$Patient', url: 'https://not-resolved/StructureDefinition/Patient' }
      ]);
    });

    it('should return the original URL if it can not be resolved or aliased', () => {
      const aliases: ExportableAlias[] = [];
      const result = optimizeURL(
        'urn:oid:2.16.840.1.113883.6.238',
        aliases,
        [utils.Type.Resource, utils.Type.Profile, utils.Type.Extension],
        fisher
      );
      expect(result).toBe('urn:oid:2.16.840.1.113883.6.238');
      expect(aliases).toHaveLength(0);
    });
  });

  describe('#resolveURL', () => {
    let fisher: utils.Fishable;

    beforeAll(() => {
      const defs = loadTestDefinitions();
      const lake = stockLake(path.join(__dirname, 'plugins', 'fixtures', 'small-profile.json'));
      fisher = new MasterFisher(lake, defs);
    });

    it('should resolve a URL the name of a local item', () => {
      const result = resolveURL(
        'https://demo.org/StructureDefinition/Patient',
        [utils.Type.Resource, utils.Type.Profile, utils.Type.Extension],
        fisher
      );
      expect(result).toBe('Patient');
    });

    it('should resolve a URL to the name of a core FHIR resource', () => {
      const result = resolveURL(
        'http://hl7.org/fhir/StructureDefinition/Group',
        [utils.Type.Resource, utils.Type.Profile, utils.Type.Extension],
        fisher
      );
      expect(result).toBe('Group');
    });

    it('should not resolve a URL to a name that would not be supported by FSH', () => {
      // FHIR Core's definition for http://terminology.hl7.org/CodeSystem/v2-0487 has name v2.0487! Totally outrageous!
      const result = resolveURL(
        'http://terminology.hl7.org/CodeSystem/v2-0487',
        [utils.Type.CodeSystem],
        fisher
      );
      expect(result).toBeUndefined();
    });

    it('should not resolve a URL to the name of a core FHIR resource if it shares a name with a local StructureDefinition', () => {
      const result = resolveURL(
        'http://hl7.org/fhir/StructureDefinition/Patient',
        [utils.Type.Resource, utils.Type.Profile, utils.Type.Extension],
        fisher
      );
      expect(result).toBeUndefined();
    });

    it('should not resolve a URL when the URL does not match anything', () => {
      const result = resolveURL(
        'https://youcantgettherefromhere.org/StructureDefinition/Patient',
        [utils.Type.Resource, utils.Type.Profile, utils.Type.Extension],
        fisher
      );
      expect(result).toBeUndefined();
    });

    it('should not resolve a URL when it only matches a type that was not asked for', () => {
      const result = resolveURL(
        'https://demo.org/StructureDefinition/Patient',
        [utils.Type.Extension],
        fisher
      );
      expect(result).toBeUndefined();
    });

    describe('#resolveAliasFromURL', () => {
      let aliases: ExportableAlias[];

      beforeEach(() => {
        aliases = [new ExportableAlias('$foo', 'http://example.org/foo')];
      });

      it('should resolve an existing alias', () => {
        const originalLength = aliases.length;
        expect(resolveAliasFromURL('http://example.org/foo', aliases)).toBe('$foo');
        expect(aliases).toHaveLength(originalLength);
      });

      it('should not resolve non-web url', () => {
        const originalLength = aliases.length;
        expect(resolveAliasFromURL('urn:oid:123', aliases)).toBeUndefined();
        expect(aliases).toHaveLength(originalLength);
      });

      it('should create a new alias using the path', () => {
        const originalLength = aliases.length;
        expect(resolveAliasFromURL('http://example.org/bar', aliases)).toBe('$bar');
        expect(aliases).toHaveLength(originalLength + 1);
        expect(aliases[aliases.length - 1]).toEqual({
          alias: '$bar',
          url: 'http://example.org/bar'
        });
      });

      it('should create a new alias using the host when no path is present', () => {
        const originalLength = aliases.length;
        expect(resolveAliasFromURL('http://example.org', aliases)).toBe('$example');
        expect(aliases).toHaveLength(originalLength + 1);
        expect(aliases[aliases.length - 1]).toEqual({
          alias: '$example',
          url: 'http://example.org'
        });
      });

      it('should create a new alias without "www" using the host when no path is present', () => {
        const originalLength = aliases.length;
        expect(resolveAliasFromURL('http://www.example.org', aliases)).toBe('$example');
        expect(aliases).toHaveLength(originalLength + 1);
        expect(aliases[aliases.length - 1]).toEqual({
          alias: '$example',
          url: 'http://www.example.org'
        });
      });

      it('should ensure newly created aliases are unique', () => {
        const originalLength = aliases.length;
        expect(resolveAliasFromURL('http://foo.org', aliases)).toBe('$foo_1');
        expect(resolveAliasFromURL('http://example.org/bar/foo', aliases)).toBe('$foo_2');
        expect(aliases).toHaveLength(originalLength + 2);
        expect(aliases[aliases.length - 2]).toEqual({
          alias: '$foo_1',
          url: 'http://foo.org'
        });
        expect(aliases[aliases.length - 1]).toEqual({
          alias: '$foo_2',
          url: 'http://example.org/bar/foo'
        });
      });
    });
  });
});
