import path from 'path';
import { fhirdefs, fshtypes } from 'fsh-sushi';
import { Package } from '../../src/processor/Package';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableInstance,
  ExportableValueSet,
  ExportableCodeSystem,
  ExportableConfiguration,
  ExportableInvariant,
  ExportableCardRule,
  ExportableFlagRule,
  ExportableContainsRule,
  ExportableOnlyRule,
  ExportableCaretValueRule,
  ExportableFixedValueRule,
  ExportableValueSetRule
} from '../../src/exportable';
import { FHIRProcessor } from '../../src/processor/FHIRProcessor';
import { ExportableCombinedCardFlagRule } from '../../src/exportable/ExportableCombinedCardFlagRule';
import { loggerSpy } from '../helpers/loggerSpy';
const { FshCode } = fshtypes;

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

    it('should remove caret value rules on a choice element that apply standard choice slicing if one of the choices exists', () => {
      const profile = new ExportableProfile('SlicedProfile');
      profile.parent = 'Observation';
      const slicingType = new ExportableCaretValueRule('value[x]');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new FshCode('type');
      const slicingPath = new ExportableCaretValueRule('value[x]');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = '$this';
      const slicingOrdered = new ExportableCaretValueRule('value[x]');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = false;
      const slicingRules = new ExportableCaretValueRule('value[x]');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');

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
      slicingType.value = new FshCode('type');
      const slicingPath = new ExportableCaretValueRule('value[x]');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = '$this';
      const slicingOrdered = new ExportableCaretValueRule('value[x]');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = false;
      const slicingRules = new ExportableCaretValueRule('value[x]');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');
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
      slicingType.value = new FshCode('type');
      const slicingPath = new ExportableCaretValueRule('note');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = '$this';
      const slicingOrdered = new ExportableCaretValueRule('note');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = false;
      const slicingRules = new ExportableCaretValueRule('note');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');
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
      slicingType.value = new FshCode('value');
      const slicingPath = new ExportableCaretValueRule('value[x]');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = 'id';
      const slicingOrdered = new ExportableCaretValueRule('value[x]');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = true;
      const slicingRules = new ExportableCaretValueRule('value[x]');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('closed');
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
      slicingType.value = new FshCode('value');
      const slicingPath = new ExportableCaretValueRule('value[x]');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = 'id';
      const slicingOrdered = new ExportableCaretValueRule('value[x]');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = false;
      const slicingRules = new ExportableCaretValueRule('value[x]');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');

      const fixedValueRule = new ExportableFixedValueRule('valueString');
      fixedValueRule.fixedValue = 'Make a choice';
      profile.rules.push(slicingType, slicingPath, slicingOrdered, slicingRules, fixedValueRule);
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(5);
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

    it('should not remove extension 0..0 rules from Profiles when there are value[x] rules', () => {
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
