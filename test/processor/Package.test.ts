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
  ExportableCaretValueRule,
  ExportableFixedValueRule
} from '../../src/exportable';
import { FHIRProcessor } from '../../src/processor/FHIRProcessor';
import { ExportableCombinedCardFlagRule } from '../../src/exportable/ExportableCombinedCardFlagRule';
import '../helpers/loggerSpy'; // suppresses console logging
import { fhirdefs, fshtypes } from 'fsh-sushi';

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

    it('should remove caret value rules on a choice element that apply standard choice slicing if one of the choices exists', () => {
      const profile = new ExportableProfile('SlicedProfile');
      profile.parent = 'Observation';
      const slicingType = new ExportableCaretValueRule('value[x]');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new fshtypes.FshCode('type');
      const slicingPath = new ExportableCaretValueRule('value[x]');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = '$this';
      const slicingOrdered = new ExportableCaretValueRule('value[x]');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = false;
      const slicingRules = new ExportableCaretValueRule('value[x]');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new fshtypes.FshCode('open');

      const fixedValueRule = new ExportableFixedValueRule('valueString');
      fixedValueRule.fixedValue = 'Make a choice';
      profile.rules.push(slicingType, slicingPath, slicingOrdered, slicingRules, fixedValueRule);
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(1);
      expect(profile.rules).toContain(fixedValueRule);
    });

    it('should not remove caret value rules on a choice element that apply standard choice slicing if none of the choices exist', () => {
      const profile = new ExportableProfile('SlicedProfile');
      profile.parent = 'Observation';
      const slicingType = new ExportableCaretValueRule('value[x]');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new fshtypes.FshCode('type');
      const slicingPath = new ExportableCaretValueRule('value[x]');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = '$this';
      const slicingOrdered = new ExportableCaretValueRule('value[x]');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = false;
      const slicingRules = new ExportableCaretValueRule('value[x]');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new fshtypes.FshCode('open');
      const fixedValueRule = new ExportableFixedValueRule('value[x].id');
      fixedValueRule.fixedValue = 'special-id';

      profile.rules.push(slicingType, slicingPath, slicingOrdered, slicingRules, fixedValueRule);
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(5);
    });

    it('should not remove caret value rules that define slicing on a non-choice element', () => {
      const profile = new ExportableProfile('SlicedProfile');
      profile.parent = 'Observation';
      const slicingType = new ExportableCaretValueRule('note');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new fshtypes.FshCode('type');
      const slicingPath = new ExportableCaretValueRule('note');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = '$this';
      const slicingOrdered = new ExportableCaretValueRule('note');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = false;
      const slicingRules = new ExportableCaretValueRule('note');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new fshtypes.FshCode('open');
      profile.rules.push(slicingType, slicingPath, slicingOrdered, slicingRules);
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(4);
    });

    it('should not remove caret value rules on a choice element that apply nonstandard choice slicing', () => {
      const profile = new ExportableProfile('SlicedProfile');
      profile.parent = 'Observation';
      const slicingType = new ExportableCaretValueRule('value[x]');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new fshtypes.FshCode('value');
      const slicingPath = new ExportableCaretValueRule('value[x]');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = 'id';
      const slicingOrdered = new ExportableCaretValueRule('value[x]');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = true;
      const slicingRules = new ExportableCaretValueRule('value[x]');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new fshtypes.FshCode('closed');
      profile.rules.push(slicingType, slicingPath, slicingOrdered, slicingRules);
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(4);
    });

    it('should not remove caret value rules on a choice element that apply some but not all of the standard choice slicing', () => {
      const profile = new ExportableProfile('SlicedProfile');
      profile.parent = 'Observation';
      const slicingType = new ExportableCaretValueRule('value[x]');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new fshtypes.FshCode('value');
      const slicingPath = new ExportableCaretValueRule('value[x]');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = 'id';
      const slicingOrdered = new ExportableCaretValueRule('value[x]');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = false;
      const slicingRules = new ExportableCaretValueRule('value[x]');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new fshtypes.FshCode('open');

      const fixedValueRule = new ExportableFixedValueRule('valueString');
      fixedValueRule.fixedValue = 'Make a choice';
      profile.rules.push(slicingType, slicingPath, slicingOrdered, slicingRules, fixedValueRule);
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(5);
    });
  });
});
