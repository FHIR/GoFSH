import { Package } from '../../src/processor/Package';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableInstance,
  ExportableValueSet,
  ExportableCodeSystem
} from '../../src/exportable';

describe('Package', () => {
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
