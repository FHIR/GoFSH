import { Package } from '../../src/processor/Package';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableInstance,
  ExportableValueSet,
  ExportableCodeSystem,
  ExportableConfiguration,
  ExportableInvariant
} from '../../src/exportable';
import { loggerSpy } from '../helpers/loggerSpy';

describe('Package', () => {
  describe('#add', () => {
    let myPackage: Package;

    beforeEach(() => {
      myPackage = new Package();
      loggerSpy.reset();
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

    it('should add an ExportableInvariant to the invariants array', () => {
      const myInvariant = new ExportableInvariant('inv-1');
      myPackage.add(myInvariant);
      expect(myPackage.invariants[0]).toBe(myInvariant);
    });

    it('should set the configuration when adding an ExportableConfiguration', () => {
      const myConfiguration = new ExportableConfiguration({
        canonical: 'https://demo.org',
        fhirVersion: ['4.0.1']
      });
      myPackage.add(myConfiguration);
      expect(myPackage.configuration).toBe(myConfiguration);
    });

    it('should not set the configuration and log a warning when adding an ExportableConfiguration and the configuration is already set', () => {
      const myConfiguration = new ExportableConfiguration({
        canonical: 'https://demo.org',
        fhirVersion: ['4.0.1']
      });
      const extraConfiguration = new ExportableConfiguration({
        canonical: 'https://oops.org',
        fhirVersion: ['4.0.1']
      });
      myPackage.add(myConfiguration);
      myPackage.add(extraConfiguration);
      expect(myPackage.configuration).toBe(myConfiguration);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Skipping implementation guide with canonical https:\/\/oops\.org/s
      );
    });
  });
});
