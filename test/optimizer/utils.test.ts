import path from 'path';
import { utils } from 'fsh-sushi';
import '../helpers/loggerSpy'; // side-effect: suppresses logs
import { MasterFisher } from '../../src/utils';
import { loadTestDefinitions, stockLake } from '../helpers';
import { resolveURL } from '../../src/optimizer/utils';

describe('optimizer', () => {
  describe('#resolveURL', () => {
    let fisher: MasterFisher;

    beforeAll(() => {
      const defs = loadTestDefinitions();
      const lake = stockLake(
        path.join(__dirname, 'plugins', 'fixtures', 'small-profile.json'),
        path.join(__dirname, 'plugins', 'fixtures', 'unsupported-codesystem.json'),
        path.join(__dirname, 'plugins', 'fixtures', 'unsupported-valueset.json')
      );
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
      expect(result).toBe('http://terminology.hl7.org/CodeSystem/v2-0487');
    });

    it('should not resolve a URL to the name of a core FHIR resource if it shares a name with a local StructureDefinition', () => {
      const result = resolveURL(
        'http://hl7.org/fhir/StructureDefinition/Patient',
        [utils.Type.Resource, utils.Type.Profile, utils.Type.Extension],
        fisher
      );
      expect(result).toBe('http://hl7.org/fhir/StructureDefinition/Patient');
    });

    // TODO: Revisit this when SUSHI supports fishing for Instance CodeSystems by name/id
    it('should not resolve a URL to a code system that is not supported by FSH syntax', () => {
      const result = resolveURL(
        'http://example.org/tests/CodeSystem/unsupported.codesystem',
        [utils.Type.CodeSystem],
        fisher
      );
      expect(result).toBe('http://example.org/tests/CodeSystem/unsupported.codesystem');
    });

    // TODO: Revisit this when SUSHI supports fishing for Instance ValueSets by name/id
    it('should not resolve a URL to a value set that is not supported by FSH syntax', () => {
      const result = resolveURL(
        'http://example.org/tests/CodeSystem/unsupported.valueset',
        [utils.Type.CodeSystem],
        fisher
      );
      expect(result).toBe('http://example.org/tests/CodeSystem/unsupported.valueset');
    });

    it('should not resolve a URL when the URL does not match anything', () => {
      const result = resolveURL(
        'https://youcantgettherefromhere.org/StructureDefinition/Patient',
        [utils.Type.Resource, utils.Type.Profile, utils.Type.Extension],
        fisher
      );
      expect(result).toBe('https://youcantgettherefromhere.org/StructureDefinition/Patient');
    });

    it('should not resolve a URL when it only matches a type that was not asked for', () => {
      const result = resolveURL(
        'https://demo.org/StructureDefinition/Patient',
        [utils.Type.Extension],
        fisher
      );
      expect(result).toBe('https://demo.org/StructureDefinition/Patient');
    });
  });
});
