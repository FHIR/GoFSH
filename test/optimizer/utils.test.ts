import path from 'path';
import { utils } from 'fsh-sushi';
import '../helpers/loggerSpy'; // side-effect: suppresses logs
import { MasterFisher } from '../../src/utils';
import { loadTestDefinitions, stockLake } from '../helpers';
import { optimizeURL, resolveURL } from '../../src/optimizer/utils';
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
  });
});
