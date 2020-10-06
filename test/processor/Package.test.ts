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
  ExportableOnlyRule
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

    // constructNamedExtensionContainsRules
    it('should construct a named extension contains rule from a contains rule and an only rule', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      const onlyRule = new ExportableOnlyRule('extension[foo]');
      onlyRule.types.push({ type: 'http://example.org/StructureDefinition/foo-extension' });
      profile.rules = [containsRule, onlyRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      const namedContainsRule = new ExportableContainsRule('extension');
      namedContainsRule.items.push({
        name: 'foo',
        type: 'http://example.org/StructureDefinition/foo-extension'
      });
      expect(profile.rules).toEqual([namedContainsRule]);
    });

    it('should construct a named extension contains rule from a contains rule and an only rule with version', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      const onlyRule = new ExportableOnlyRule('extension[foo]');
      onlyRule.types.push({ type: 'http://example.org/StructureDefinition/foo-extension|1.2.3' });
      profile.rules = [containsRule, onlyRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      const namedContainsRule = new ExportableContainsRule('extension');
      namedContainsRule.items.push({
        name: 'foo',
        type: 'http://example.org/StructureDefinition/foo-extension|1.2.3'
      });
      expect(profile.rules).toEqual([namedContainsRule]);
    });

    it('should construct a named extension contains rule from a contains rule with multiple items with only rules', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      containsRule.items.push({ name: 'bar' });
      const onlyRule1 = new ExportableOnlyRule('extension[foo]');
      onlyRule1.types.push({ type: 'http://example.org/StructureDefinition/foo-extension' });
      const onlyRule2 = new ExportableOnlyRule('extension[bar]');
      onlyRule2.types.push({ type: 'http://example.org/StructureDefinition/bar-extension' });
      profile.rules = [containsRule, onlyRule1, onlyRule2];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      const namedContainsRule = new ExportableContainsRule('extension');
      namedContainsRule.items.push({
        name: 'foo',
        type: 'http://example.org/StructureDefinition/foo-extension'
      });
      namedContainsRule.items.push({
        name: 'bar',
        type: 'http://example.org/StructureDefinition/bar-extension'
      });
      expect(profile.rules).toEqual([namedContainsRule]);
    });

    it('should not construct a named extension contains rule from a contains rule alone', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      const flagRule = new ExportableFlagRule('extension[foo]');
      flagRule.mustSupport = true;
      profile.rules = [containsRule, flagRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      // rules should be unchanged
      expect(profile.rules).toEqual([containsRule, flagRule]);
    });

    it('should not construct a named extension contains rule from a contains rule with a multi-type only rule', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      const onlyRule = new ExportableOnlyRule('extension[foo]');
      onlyRule.types.push(
        { type: 'http://example.org/StructureDefinition/foo-profile-1' },
        { type: 'http://example.org/StructureDefinition/foo-profile-2' }
      );
      profile.rules = [containsRule, onlyRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      // nothing should change
      expect(profile.rules).toEqual([containsRule, onlyRule]);
    });

    it('should not construct a named extension contains rule from a contains rule not on an extension', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const containsRule = new ExportableContainsRule('component');
      containsRule.items.push({ name: 'foo' });
      const onlyRule = new ExportableOnlyRule('component[foo]');
      onlyRule.types.push(
        { type: 'http://example.org/StructureDefinition/foo-profile-1' },
        { type: 'http://example.org/StructureDefinition/foo-profile-2' }
      );
      profile.rules = [containsRule, onlyRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      // nothing should change
      expect(profile.rules).toEqual([containsRule, onlyRule]);
    });

    it('should not construct a named extension contains rule from a contains rule with an only rule on Extension', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      const onlyRule = new ExportableOnlyRule('extension[foo]');
      onlyRule.types.push({ type: 'Extension' });
      profile.rules = [containsRule, onlyRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      // nothing should change
      expect(profile.rules).toEqual([containsRule, onlyRule]);
    });
  });
});
