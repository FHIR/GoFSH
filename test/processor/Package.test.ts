import { Package } from '../../src/processor/Package';
import { Profile, Extension, Instance, FshValueSet, FshCodeSystem } from 'fsh-sushi/dist/fshtypes';

describe('Package', () => {
  let myPackage: Package;

  beforeEach(() => {
    myPackage = new Package();
  });

  it('should add a Profile to the profiles array', () => {
    const myProfile = new Profile('MyProfile');
    myPackage.add(myProfile);
    expect(myPackage.profiles[0]).toBe(myProfile);
  });

  it('should add an Extension to the extensions array', () => {
    const myExtension = new Extension('MyExtension');
    myPackage.add(myExtension);
    expect(myPackage.extensions[0]).toBe(myExtension);
  });

  it('should add an Instance to the instances array', () => {
    const myInstance = new Instance('MyInstance');
    myPackage.add(myInstance);
    expect(myPackage.instances[0]).toBe(myInstance);
  });

  it('should add a FshValueSet to the valueSets array', () => {
    const myValueSet = new FshValueSet('MyValueSet');
    myPackage.add(myValueSet);
    expect(myPackage.valueSets[0]).toBe(myValueSet);
  });

  it('should add a FshCodeSystem to the codeSystems array', () => {
    const myCodeSystem = new FshCodeSystem('MyCodeSystem');
    myPackage.add(myCodeSystem);
    expect(myPackage.codeSystems[0]).toBe(myCodeSystem);
  });
});
