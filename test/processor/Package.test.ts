import path from 'path';
import { fhirdefs } from 'fsh-sushi';
import { Package } from '../../src/processor/Package';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableInstance,
  ExportableValueSet,
  ExportableCodeSystem,
  ExportableCardRule,
  ExportableFlagRule,
  ExportableInvariant
} from '../../src/exportable';
import { FHIRProcessor } from '../../src/processor/FHIRProcessor';
import { ExportableCombinedCardFlagRule } from '../../src/exportable/ExportableCombinedCardFlagRule';
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

    it('should not add an ExportableInvariant that is already present in the invariants array', () => {
      const firstInvariant = new ExportableInvariant('inv-2');
      firstInvariant.description = 'Follow this rule!';
      const secondInvariant = new ExportableInvariant('inv-2');
      secondInvariant.description = 'Follow this rule!';

      myPackage.add(firstInvariant);
      expect(myPackage.invariants).toHaveLength(1);
      myPackage.add(secondInvariant);
      expect(myPackage.invariants).toHaveLength(1);
      expect(loggerSpy.getAllLogs('error')).toHaveLength(0);
    });

    it('should log an error and not add an ExportableInvariant when a different ExportableInvariant with the same name is in the invariants array', () => {
      const firstInvariant = new ExportableInvariant('inv-3');
      firstInvariant.description = 'Follow this rule!';
      const secondInvariant = new ExportableInvariant('inv-3');
      secondInvariant.description = 'Do this instead!';

      myPackage.add(firstInvariant);
      expect(myPackage.invariants).toHaveLength(1);
      myPackage.add(secondInvariant);
      expect(myPackage.invariants).toHaveLength(1);
      expect(myPackage.invariants).toContainEqual(firstInvariant);
      expect(myPackage.invariants).not.toContainEqual(secondInvariant);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Cannot add invariant: different invariant with name inv-3 already found/s
      );
    });
  });

  describe('#optimize', () => {
    let processor: FHIRProcessor;

    beforeAll(() => {
      processor = new FHIRProcessor(new fhirdefs.FHIRDefinitions());
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

    it('should combine a card rule and flag rule having the same path', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const cardRule = new ExportableCardRule('code');
      cardRule.min = 1;
      const flagRule = new ExportableFlagRule('code');
      flagRule.mustSupport = true;
      flagRule.summary = true;
      profile.rules = [cardRule, flagRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      const cardFlagRule = new ExportableCombinedCardFlagRule('code', cardRule, flagRule);
      expect(profile.rules).toEqual([cardFlagRule]);
    });

    it('should not combine a card rule and flag rule having different paths', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const cardRule = new ExportableCardRule('code');
      cardRule.min = 1;
      const flagRule = new ExportableFlagRule('value[x]');
      flagRule.mustSupport = true;
      flagRule.summary = true;
      profile.rules = [cardRule, flagRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toEqual([cardRule, flagRule]);
    });
  });
});
