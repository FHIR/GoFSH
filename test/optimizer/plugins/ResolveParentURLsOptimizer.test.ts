import path from 'path';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor';
import {
  ExportableExtension,
  ExportableProfile,
  ExportableLogical,
  ExportableResource
} from '../../../src/exportable';
import { MasterFisher } from '../../../src/utils';
import { loadTestDefinitions, stockLake } from '../../helpers';
import optimizer from '../../../src/optimizer/plugins/ResolveParentURLsOptimizer';

describe('optimizer', () => {
  describe('#resolve_parent_urls', () => {
    let fisher: MasterFisher;

    beforeAll(() => {
      const defs = loadTestDefinitions();
      const lake = stockLake(
        path.join(__dirname, 'fixtures', 'small-profile.json'),
        path.join(__dirname, 'fixtures', 'small-extension.json'),
        path.join(__dirname, 'fixtures', 'small-logical.json'),
        path.join(__dirname, 'fixtures', 'small-resource.json'),
        path.join(__dirname, 'fixtures', 'patient-profile.json')
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
      profile.parent = 'https://demo.org/StructureDefinition/SmallPatient';
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher);
      expect(profile.parent).toBe('SmallPatient');
    });

    it('should replace an extension parent url with the name of the parent', () => {
      const extension = new ExportableExtension('ExtraExtension');
      extension.parent = 'https://demo.org/StructureDefinition/SmallExtension';
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage, fisher);
      expect(extension.parent).toBe('SmallExtension');
    });

    it('should replace a logical parent url with the name of the parent', () => {
      const logical = new ExportableLogical('ExtraLogical');
      logical.parent = 'http://demo.org/StructureDefinition/SmallLogical';
      const myPackage = new Package();
      myPackage.add(logical);
      optimizer.optimize(myPackage, fisher);
      expect(logical.parent).toBe('SmallLogical');
    });

    it('should replace a resource parent url with the name of the parent', () => {
      const resource = new ExportableResource('ExtraResource');
      resource.parent = 'http://demo.org/StructureDefinition/SmallResource';
      const myPackage = new Package();
      myPackage.add(resource);
      optimizer.optimize(myPackage, fisher);
      expect(resource.parent).toBe('SmallResource');
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

    it('should replace a logical parent url with the name of a core FHIR resource', () => {
      const logical = new ExportableLogical('MyLogical');
      logical.parent = 'http://hl7.org/fhir/StructureDefinition/Observation';
      const myPackage = new Package();
      myPackage.add(logical);
      optimizer.optimize(myPackage, fisher);
      expect(logical.parent).toBe('Observation');
    });

    it('should replace a resource parent url with the name of a core FHIR resource', () => {
      // The only legal parents for a Resource defined in SUSHI are FHIR Resource and DomainResource.
      // DomainResource is the default in SUSHI, so the other choice is FHIR Resource.
      const resource = new ExportableResource('MyResource');
      resource.parent = 'http://hl7.org/fhir/StructureDefinition/Resource';
      const myPackage = new Package();
      myPackage.add(resource);
      optimizer.optimize(myPackage, fisher);
      expect(resource.parent).toBe('Resource');
    });

    it('should alias a core FHIR resource if it shares a name with a local StructureDefinition and alias is true', () => {
      const profile = new ExportableProfile('MyPatient');
      profile.parent = 'http://hl7.org/fhir/StructureDefinition/Patient';
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher, { alias: true });
      expect(profile.parent).toBe('$Patient');
      expect(myPackage.aliases).toEqual([
        { alias: '$Patient', url: 'http://hl7.org/fhir/StructureDefinition/Patient' }
      ]);
    });

    it('should alias a core FHIR resource if it shares a name with a local StructureDefinition and alias is undefined', () => {
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

    it('should not alias a core FHIR resource if it shares a name with a local StructureDefinition and alias is false', () => {
      const profile = new ExportableProfile('MyPatient');
      profile.parent = 'http://hl7.org/fhir/StructureDefinition/Patient';
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher, { alias: false });
      expect(profile.parent).toBe('http://hl7.org/fhir/StructureDefinition/Patient');
      expect(myPackage.aliases).toHaveLength(0);
    });

    it('should alias the profile parent url if the parent is not found and alias is true', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'https://demo.org/StructureDefinition/MediumProfile';
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher, { alias: true });
      expect(profile.parent).toBe('$MediumProfile');
      expect(myPackage.aliases).toEqual([
        { alias: '$MediumProfile', url: 'https://demo.org/StructureDefinition/MediumProfile' }
      ]);
    });

    it('should alias the profile parent url if the parent is not found and alias is undefined', () => {
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

    it('should not alias the profile parent url if the parent is not found and alias is false', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'https://demo.org/StructureDefinition/MediumProfile';
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher, { alias: false });
      expect(profile.parent).toBe('https://demo.org/StructureDefinition/MediumProfile');
      expect(myPackage.aliases).toHaveLength(0);
    });
  });
});
