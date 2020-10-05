import path from 'path';
import { Package } from '../../src/processor/Package';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableInstance,
  ExportableValueSet,
  ExportableCodeSystem,
  ExportableCardRule,
  ExportableFlagRule,
  ExportableContainsRule,
  ExportableOnlyRule,
  ExportableValueSetRule
} from '../../src/exportable';
import { FHIRProcessor } from '../../src/processor/FHIRProcessor';
import { ExportableCombinedCardFlagRule } from '../../src/exportable/ExportableCombinedCardFlagRule';
import '../helpers/loggerSpy'; // suppresses console logging
import { fhirdefs } from 'fsh-sushi';

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

    it('should remove value[x] 0..0 rules from Extensions when there are extension rules', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const extRule = new ExportableContainsRule('extension');
      extRule.items = [{ name: 'my-sub-extension' }];
      const valueRule = new ExportableCardRule('value[x]');
      valueRule.min = 0;
      valueRule.max = '0';
      extension.rules = [extRule, valueRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toEqual([extRule]);
    });

    it('should remove extension 0..0 rules from Extensions when there are value[x] rules', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const valueRule = new ExportableOnlyRule('value[x]');
      valueRule.types = [{ type: 'Quantity' }];
      const extRule = new ExportableCardRule('extension');
      extRule.min = 0;
      extRule.max = '0';
      extension.rules = [valueRule, extRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toEqual([valueRule]);
    });

    it('should remove extension 0..0 rules from Extensions when there are specific value choice rules', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const valueRule = new ExportableValueSetRule('valueCodeableConcept');
      valueRule.strength = 'required';
      valueRule.valueSet = 'http://example.org/FooVS';
      const extRule = new ExportableCardRule('extension');
      extRule.min = 0;
      extRule.max = '0';
      extension.rules = [valueRule, extRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toEqual([valueRule]);
    });

    it('should remove nested value[x] 0..0 rules from Extensions when there are nested extension rules', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const extRule = new ExportableContainsRule('extension');
      extRule.items = [{ name: 'my-sub-extension' }];
      const nestedExtRule = new ExportableContainsRule('extension[my-sub-extension].extension');
      nestedExtRule.items = [{ name: 'my-sub-sub-extension' }];
      const nestedValueRule = new ExportableCardRule('extension[my-sub-extension].value[x]');
      nestedValueRule.min = 0;
      nestedValueRule.max = '0';
      const valueRule = new ExportableCardRule('value[x]');
      valueRule.min = 0;
      valueRule.max = '0';
      extension.rules = [extRule, nestedExtRule, nestedValueRule, valueRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toEqual([extRule, nestedExtRule]);
    });

    it('should remove nested extension 0..0 rules from Extensions when there are nested value rules', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const extRule = new ExportableContainsRule('extension');
      extRule.items = [{ name: 'my-sub-extension' }];
      const nestedValueRule = new ExportableOnlyRule('extension[my-sub-extension].value[x]');
      nestedValueRule.types = [{ type: 'Quantity' }];
      const nestedExtRule = new ExportableCardRule('extension[my-sub-extension].extension');
      nestedExtRule.min = 0;
      nestedExtRule.max = '0';
      const valueRule = new ExportableCardRule('value[x]');
      valueRule.min = 0;
      valueRule.max = '0';
      extension.rules = [extRule, nestedValueRule, nestedExtRule, valueRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toEqual([extRule, nestedValueRule]);
    });

    it('should not remove value[x] 0..0 rules from Extensions if there are not any extension rules', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const valueRule = new ExportableCardRule('value[x]');
      valueRule.min = 0;
      valueRule.max = '0';
      extension.rules = [valueRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toEqual([valueRule]);
    });

    it('should not remove extension 0..0 rules from Extensions if there are not any value[x] rules', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const extRule = new ExportableCardRule('extension');
      extRule.min = 0;
      extRule.max = '0';
      extension.rules = [extRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toEqual([extRule]);
    });

    it('should not remove value[x] 0..0 rules or extension 0..0 rules if both are present', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const extRule = new ExportableCardRule('extension');
      extRule.min = 0;
      extRule.max = '0';
      const valueRule = new ExportableCardRule('value[x]');
      valueRule.min = 0;
      valueRule.max = '0';
      extension.rules = [extRule, valueRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toEqual([extRule, valueRule]);
    });

    it('should not remove value[x] 0..0 rules from Profiles', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const extRule = new ExportableContainsRule('extension');
      extRule.items = [{ name: 'my-sub-extension' }];
      const valueRule = new ExportableCardRule('value[x]');
      valueRule.min = 0;
      valueRule.max = '0';
      profile.rules = [extRule, valueRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toEqual([extRule, valueRule]);
    });

    it('should not remove extension 0..0 rules from Extensions when there are value[x] rules', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const valueRule = new ExportableOnlyRule('value[x]');
      valueRule.types = [{ type: 'Quantity' }];
      const extRule = new ExportableCardRule('extension');
      extRule.min = 0;
      extRule.max = '0';
      profile.rules = [valueRule, extRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toEqual([valueRule, extRule]);
    });
  });
});
