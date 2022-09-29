import { Package } from '../../src/processor/Package';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableInstance,
  ExportableValueSet,
  ExportableCodeSystem,
  ExportableConfiguration,
  ExportableInvariant,
  ExportableMapping,
  ExportableAlias
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

    it('should add an ExportableMapping to the mappings array', () => {
      const myMapping = new ExportableMapping('MyMapping');
      myPackage.add(myMapping);
      expect(myPackage.mappings[0]).toBe(myMapping);
    });

    it('should add an ExportableAlias to the aliases array', () => {
      const myAlias = new ExportableAlias('MyAlias', 'http://example.org/');
      myPackage.add(myAlias);
      expect(myPackage.aliases[0]).toBe(myAlias);
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

    it('should log an error and add duplicate named exports to the corresponding arrays', () => {
      const myProfile = new ExportableProfile('MyProfile');
      myProfile.id = 'my-profile';
      const myDupProfile = new ExportableProfile('MyProfile');
      myDupProfile.id = 'my-other-profile';
      myPackage.add(myProfile);
      myPackage.add(myDupProfile);
      expect(myPackage.profiles).toHaveLength(2);
      expect(myPackage.profiles[0]).toBe(myProfile);
      expect(myPackage.profiles[1]).toBe(myDupProfile);

      const myExtension = new ExportableExtension('MyExtension');
      myExtension.id = 'my-extension';
      const myDupExtension = new ExportableExtension('MyExtension');
      myDupExtension.id = 'my-other-extension';
      myPackage.add(myExtension);
      myPackage.add(myDupExtension);
      expect(myPackage.extensions).toHaveLength(2);
      expect(myPackage.extensions[0]).toBe(myExtension);
      expect(myPackage.extensions[1]).toBe(myDupExtension);

      const myInstance = new ExportableInstance('MyInstance');
      // (no separate id to set)
      const myDupInstance = new ExportableInstance('MyInstance');
      // (no separate id to set)
      myPackage.add(myInstance);
      myPackage.add(myDupInstance);
      expect(myPackage.instances).toHaveLength(2);
      expect(myPackage.instances[0]).toBe(myInstance);
      expect(myPackage.instances[1]).toBe(myDupInstance);

      const myValueSet = new ExportableValueSet('MyValueSet');
      myValueSet.id = 'my-value-set';
      const myDupValueSet = new ExportableValueSet('MyValueSet');
      myDupValueSet.id = 'my-other-value-set';
      myPackage.add(myValueSet);
      myPackage.add(myDupValueSet);
      expect(myPackage.valueSets).toHaveLength(2);
      expect(myPackage.valueSets[0]).toBe(myValueSet);
      expect(myPackage.valueSets[1]).toBe(myDupValueSet);

      const myCodeSystem = new ExportableCodeSystem('MyCodeSystem');
      myCodeSystem.id = 'my-code-system';
      const myDupCodeSystem = new ExportableCodeSystem('MyCodeSystem');
      myDupCodeSystem.id = 'my-other-code-system';
      myPackage.add(myCodeSystem);
      myPackage.add(myDupCodeSystem);
      expect(myPackage.codeSystems).toHaveLength(2);
      expect(myPackage.codeSystems[0]).toBe(myCodeSystem);
      expect(myPackage.codeSystems[1]).toBe(myDupCodeSystem);

      const myInvariant = new ExportableInvariant('inv-1');
      // (no separate id to set)
      const myDupInvariant = new ExportableInvariant('inv-1');
      // (no separate id to set)
      myPackage.add(myInvariant);
      myPackage.add(myDupInvariant);
      expect(myPackage.invariants).toHaveLength(2);
      expect(myPackage.invariants[0]).toBe(myInvariant);
      expect(myPackage.invariants[1]).toBe(myDupInvariant);

      const myMapping = new ExportableMapping('MyMapping');
      // (no separate id to set)
      const myDupMapping = new ExportableMapping('MyMapping');
      // (no separate id to set)
      myPackage.add(myMapping);
      myPackage.add(myDupMapping);
      expect(myPackage.mappings).toHaveLength(2);
      expect(myPackage.mappings[0]).toBe(myMapping);
      expect(myPackage.mappings[1]).toBe(myDupMapping);

      expect(loggerSpy.getAllMessages('error')).toHaveLength(7);
      expect(loggerSpy.getMessageAtIndex(0, 'error')).toMatch(
        /Encountered profiles \(id: my-profile and id: my-other-profile\) with duplicate name: MyProfile\./
      );
      expect(loggerSpy.getMessageAtIndex(1, 'error')).toMatch(
        /Encountered extensions \(id: my-extension and id: my-other-extension\) with duplicate name: MyExtension\./
      );
      expect(loggerSpy.getMessageAtIndex(2, 'error')).toMatch(
        /Encountered instances \(id: MyInstance and id: MyInstance\) with duplicate name: MyInstance\./
      );
      expect(loggerSpy.getMessageAtIndex(3, 'error')).toMatch(
        /Encountered value sets \(id: my-value-set and id: my-other-value-set\) with duplicate name: MyValueSet\./
      );
      expect(loggerSpy.getMessageAtIndex(4, 'error')).toMatch(
        /Encountered code systems \(id: my-code-system and id: my-other-code-system\) with duplicate name: MyCodeSystem\./
      );
      expect(loggerSpy.getMessageAtIndex(5, 'error')).toMatch(
        /Encountered invariants \(id: inv-1 and id: inv-1\) with duplicate name: inv-1\./
      );
      expect(loggerSpy.getMessageAtIndex(6, 'error')).toMatch(
        /Encountered mappings \(id: MyMapping and id: MyMapping\) with duplicate name: MyMapping\./
      );
    });

    it('should not log an error when a second alias is added with a different name', () => {
      const myAlias = new ExportableAlias('MyAlias', 'http://example.org/');
      const anotherAlias = new ExportableAlias('AnotherAlias', 'http://different-example.org/');
      myPackage.add(myAlias);
      myPackage.add(anotherAlias);
      expect(myPackage.aliases).toHaveLength(2);
      expect(myPackage.aliases[0]).toBe(myAlias);
      expect(myPackage.aliases[1]).toBe(anotherAlias);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should log an error and not add the alias when an alias with a duplicate name and different url is added', () => {
      const myAlias = new ExportableAlias('MyAlias', 'http://example.org/');
      const duplicateAlias = new ExportableAlias('MyAlias', 'http://different-example.org/');
      myPackage.add(myAlias);
      myPackage.add(duplicateAlias);
      expect(myPackage.aliases).toHaveLength(1);
      expect(myPackage.aliases[0]).toBe(myAlias);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Encountered alias with a duplicate name, MyAlias/s
      );
    });

    it('should not log an error and not add the alias when an alias with a duplicate name and matching url is added', () => {
      const myAlias = new ExportableAlias('MyAlias', 'http://example.org/');
      const duplicateAlias = new ExportableAlias('MyAlias', 'http://example.org/');
      myPackage.add(myAlias);
      myPackage.add(duplicateAlias);
      expect(myPackage.aliases).toHaveLength(1);
      expect(myPackage.aliases[0]).toBe(myAlias);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });
  });
});
