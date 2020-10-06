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
  ExportableCaretValueRule
} from '../../src/exportable';
import { FHIRProcessor } from '../../src/processor/FHIRProcessor';
import { ExportableCombinedCardFlagRule } from '../../src/exportable/ExportableCombinedCardFlagRule';
import '../helpers/loggerSpy'; // suppresses console logging
import { fhirdefs, fshtypes } from 'fsh-sushi';
const { FshCode } = fshtypes;

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

    it('should remove default context from extensions', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const typeRule = new ExportableCaretValueRule('');
      typeRule.caretPath = 'context[0].type';
      typeRule.value = new FshCode('element');
      const expressionRule = new ExportableCaretValueRule('');
      expressionRule.caretPath = 'context[0].expression';
      expressionRule.value = 'Element';
      extension.rules = [typeRule, expressionRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toHaveLength(0);
    });

    it('should not remove non-default context from extensions (different type)', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const typeRule = new ExportableCaretValueRule('');
      typeRule.caretPath = 'context[0].type';
      typeRule.value = new FshCode('fhirpath');
      const expressionRule = new ExportableCaretValueRule('');
      expressionRule.caretPath = 'context[0].expression';
      expressionRule.value = 'Element';
      extension.rules = [typeRule, expressionRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toHaveLength(2);
    });

    it('should not remove non-default context from extensions (different expression)', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const typeRule = new ExportableCaretValueRule('');
      typeRule.caretPath = 'context[0].type';
      typeRule.value = new FshCode('element');
      const expressionRule = new ExportableCaretValueRule('');
      expressionRule.caretPath = 'context[0].expression';
      expressionRule.value = 'BackboneElement';
      extension.rules = [typeRule, expressionRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toHaveLength(2);
    });

    it('should not remove default context from extensions when there is more than one context', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const typeRule = new ExportableCaretValueRule('');
      typeRule.caretPath = 'context[0].type';
      typeRule.value = new FshCode('element');
      const expressionRule = new ExportableCaretValueRule('');
      expressionRule.caretPath = 'context[0].expression';
      expressionRule.value = 'Element';
      const typeRule2 = new ExportableCaretValueRule('');
      typeRule2.caretPath = 'context[1].type';
      typeRule2.value = new FshCode('element');
      const expressionRule2 = new ExportableCaretValueRule('');
      expressionRule2.caretPath = 'context[1].expression';
      expressionRule2.value = 'CodeSystem';
      extension.rules = [typeRule, expressionRule, typeRule2, expressionRule2];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toHaveLength(4);
    });

    it('should not remove default context from profiles', () => {
      // Technically, I don't think having context on a profile is allowed, but check just in case
      const profile = new ExportableProfile('ExtraProfile');
      const typeRule = new ExportableCaretValueRule('');
      typeRule.caretPath = 'context[0].type';
      typeRule.value = new FshCode('element');
      const expressionRule = new ExportableCaretValueRule('');
      expressionRule.caretPath = 'context[0].expression';
      expressionRule.value = 'Element';
      profile.rules = [typeRule, expressionRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(2);
    });
  });
});
