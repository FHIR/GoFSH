import path from 'path';
import { Package } from '../../src/processor/Package';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableInstance,
  ExportableValueSet,
  ExportableCodeSystem
} from '../../src/exportable';
import { FHIRProcessor } from '../../src/processor/FHIRProcessor';

describe('Package', () => {
  describe('#add', () => {
    let myPackage: Package;

    beforeEach(() => {
      myPackage = new Package();
    });

    it('should add an ExportableProfile to the profiles array', () => {
      const myProfile = new ExportableProfile('MyProfile');
      myPackage.add(myProfile);
      expect(myPackage.profiles[0]).toBe(myProfile);
    });

    it('should add an ExportableExtension to the extensions array', () => {
      const myExtension = new ExportableExtension('MyExtension');
      myPackage.add(myExtension);
      expect(myPackage.extensions[0]).toBe(myExtension);
    });

    it('should add an ExportableInstance to the instances array', () => {
      const myInstance = new ExportableInstance('MyInstance');
      myPackage.add(myInstance);
      expect(myPackage.instances[0]).toBe(myInstance);
    });

    it('should add an ExportableValueSet to the valueSets array', () => {
      const myValueSet = new ExportableValueSet('MyValueSet');
      myPackage.add(myValueSet);
      expect(myPackage.valueSets[0]).toBe(myValueSet);
    });

    it('should add an ExportableCodeSystem to the codeSystems array', () => {
      const myCodeSystem = new ExportableCodeSystem('MyCodeSystem');
      myPackage.add(myCodeSystem);
      expect(myPackage.codeSystems[0]).toBe(myCodeSystem);
    });
  });

  describe('#optimize', () => {
    let processor: FHIRProcessor;

    beforeAll(() => {
      processor = new FHIRProcessor();
      // add a StructureDefinition to the processor
      processor.process(path.join(__dirname, 'fixtures', 'small-profile.json'));
    });

    it('should replace a profile parent url with the name of the parent', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'https://demo.org/StructureDefinition/SmallProfile';
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.parent).toBe('SmallProfile');
    });

    it('should not change the profile parent url if the parent is not found', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'https://demo.org/StructureDefinition/MediumProfile';
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.parent).toBe('https://demo.org/StructureDefinition/MediumProfile');
    });
  });
});
