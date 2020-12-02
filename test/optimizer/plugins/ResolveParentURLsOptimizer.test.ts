import path from 'path';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { utils } from 'fsh-sushi';
import { Package } from '../../../src/processor';
import { ExportableExtension, ExportableProfile } from '../../../src/exportable';
import { MasterFisher } from '../../../src/utils';
import { loadTestDefinitions, stockLake } from '../../helpers';
import optimizer from '../../../src/optimizer/plugins/ResolveParentURLsOptimizer';

describe('optimizer', () => {
  describe('#resolve_parent_urls', () => {
    let fisher: utils.Fishable;

    beforeAll(() => {
      const defs = loadTestDefinitions();
      const lake = stockLake(
        path.join(__dirname, 'fixtures', 'small-profile.json'),
        path.join(__dirname, 'fixtures', 'small-extension.json')
      );
      fisher = new MasterFisher(lake, defs);
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('resolve_parent_urls');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should replace a profile parent url with the name of the parent', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'https://demo.org/StructureDefinition/Patient';
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher);
      expect(profile.parent).toBe('Patient');
    });

    it('should replace an extension parent url with the name of the parent', () => {
      const extension = new ExportableExtension('ExtraExtension');
      extension.parent = 'https://demo.org/StructureDefinition/SmallExtension';
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage, fisher);
      expect(extension.parent).toBe('SmallExtension');
    });

    it('should replace a profile parent url with the name of a core FHIR resource', () => {
      const profile = new ExportableProfile('MyObservation');
      profile.parent = 'http://hl7.org/fhir/StructureDefinition/Observation';
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher);
      expect(profile.parent).toBe('Observation');
    });

    it('should replace an extension parent url with the name of a core FHIR extension', () => {
      const extension = new ExportableExtension('MyNewExtension');
      extension.parent = 'http://hl7.org/fhir/StructureDefinition/geolocation';
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage, fisher);
      expect(extension.parent).toBe('Geolocation');
    });

    it('should alias a core FHIR resource if it shares a name with a local StructureDefinition', () => {
      const profile = new ExportableProfile('MyPatient');
      profile.parent = 'http://hl7.org/fhir/StructureDefinition/Patient';
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher);
      expect(profile.parent).toBe('$Patient');
      expect(myPackage.aliases).toEqual([
        { alias: '$Patient', url: 'http://hl7.org/fhir/StructureDefinition/Patient' }
      ]);
    });

    it('should alias the profile parent url if the parent is not found', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'https://demo.org/StructureDefinition/MediumProfile';
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher);
      expect(profile.parent).toBe('$MediumProfile');
      expect(myPackage.aliases).toEqual([
        { alias: '$MediumProfile', url: 'https://demo.org/StructureDefinition/MediumProfile' }
      ]);
    });
  });
});
