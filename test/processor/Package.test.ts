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
  ExportableMapping,
  ExportableCardRule,
  ExportableFlagRule,
  ExportableContainsRule,
  ExportableOnlyRule,
  ExportableCaretValueRule,
  ExportableAssignmentRule,
  ExportableBindingRule
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

    it('should add an ExportableMapping to the mappings array', () => {
      const myMapping = new ExportableMapping('MyMapping');
      myPackage.add(myMapping);
      expect(myPackage.mappings[0]).toBe(myMapping);
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
      // add some StructureDefinitions to the processor
      processor.register(path.join(__dirname, 'fixtures', 'small-profile.json'));
      processor.register(path.join(__dirname, 'fixtures', 'small-extension.json'));
    });

    it('should replace a profile parent url with the name of the parent', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'https://demo.org/StructureDefinition/Patient';
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.parent).toBe('Patient');
    });

    it('should replace an extension parent url with the name of the parent', () => {
      const extension = new ExportableExtension('ExtraExtension');
      extension.parent = 'https://demo.org/StructureDefinition/SmallExtension';
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.parent).toBe('SmallExtension');
    });

    it('should replace a profile parent url with the name of a core FHIR resource', () => {
      const profile = new ExportableProfile('MyObservation');
      profile.parent = 'http://hl7.org/fhir/StructureDefinition/Observation';
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.parent).toBe('Observation');
    });

    it('should replace an extension parent url with the name of a core FHIR resource', () => {
      const extension = new ExportableExtension('MyNewExtension');
      extension.parent = 'http://hl7.org/fhir/StructureDefinition/allergyintolerance-certainty';
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.parent).toBe('allergyintolerance-certainty');
    });

    it('should not replace a parent url with the name of a core FHIR resource if it shares a name with a local StructureDefinition', () => {
      const profile = new ExportableProfile('MyPatient');
      profile.parent = 'http://hl7.org/fhir/StructureDefinition/Patient';
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.parent).toBe('http://hl7.org/fhir/StructureDefinition/Patient');
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

      const assignmentRule = new ExportableAssignmentRule('valueString');
      assignmentRule.value = 'Make a choice';
      profile.rules.push(slicingType, slicingPath, slicingOrdered, slicingRules, assignmentRule);
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(1);
      expect(profile.rules).toContain(assignmentRule);
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
      const assignmentRule = new ExportableAssignmentRule('value[x].id');
      assignmentRule.value = 'special-id';

      profile.rules.push(slicingType, slicingPath, slicingOrdered, slicingRules, assignmentRule);
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

      const assignmentRule = new ExportableAssignmentRule('valueString');
      assignmentRule.value = 'Make a choice';
      profile.rules.push(slicingType, slicingPath, slicingOrdered, slicingRules, assignmentRule);
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
      const bindingRule = new ExportableBindingRule('valueCodeableConcept');
      bindingRule.strength = 'required';
      bindingRule.valueSet = 'http://example.org/FooVS';
      const extRule = new ExportableCardRule('extension');
      extRule.min = 0;
      extRule.max = '0';
      extension.rules = [bindingRule, extRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toEqual([bindingRule]);
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

    // suppressUrlAssignmentOnExtensions
    it('should remove URL assignment rules on inline extensions on an extension', () => {
      const extension = new ExportableExtension('MyExtension');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      const assignmentRule = new ExportableAssignmentRule('extension[foo].url');
      assignmentRule.value = 'foo';
      extension.rules = [containsRule, assignmentRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toEqual([containsRule]);
    });

    it('should remove URL assignment rules on inline extensions on a modifierExtension', () => {
      const extension = new ExportableExtension('MyExtension');
      const containsRule = new ExportableContainsRule('modifierExtension');
      containsRule.items.push({ name: 'foo' });
      const assignmentRule = new ExportableAssignmentRule('modifierExtension[foo].url');
      assignmentRule.value = 'foo';
      extension.rules = [containsRule, assignmentRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toEqual([containsRule]);
    });

    it('should remove URL assignment rules on inline extensions on a profile', () => {
      // Note that inline extensions on a profile are poor form, SUSHI allows it, but it is not valid
      // FHIR and the IG Publisher will get mad
      const profile = new ExportableProfile('MyProfile');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      const assignmentRule = new ExportableAssignmentRule('extension[foo].url');
      assignmentRule.value = 'foo';
      profile.rules = [containsRule, assignmentRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toEqual([containsRule]);
    });

    it('should not remove other URL rules on inline extensions on a profile', () => {
      const profile = new ExportableProfile('MyProfile');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      const flagRule = new ExportableFlagRule('extension[foo].url');
      flagRule.mustSupport = true;
      profile.rules = [containsRule, flagRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toEqual([containsRule, flagRule]);
    });

    it('should remove a URL assignment rule on an extension only when that URL matches the canonical', () => {
      const extension = new ExportableExtension('MyExtension');
      const assignmentRule = new ExportableAssignmentRule('url');
      assignmentRule.value = 'http://example.org/StructureDefinition/MyExtension';
      extension.rules = [assignmentRule];
      const myPackage = new Package();
      myPackage.configuration = new ExportableConfiguration({
        fhirVersion: ['4.0.1'],
        canonical: 'http://example.org'
      });
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toEqual([]);
    });

    it('should not remove a URL assignment rule on an extension when that URL does not match the canonical', () => {
      const extension = new ExportableExtension('MyExtension');
      const assignmentRule = new ExportableAssignmentRule('url');
      assignmentRule.value = 'http://example.org/StructureDefinition/MyExtension';
      extension.rules = [assignmentRule];
      const myPackage = new Package();
      myPackage.configuration = new ExportableConfiguration({
        fhirVersion: ['4.0.1'],
        canonical: 'http://other-canonical.org'
      });
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toEqual([assignmentRule]);
    });

    it('should not remove a URL assignment rule on an extension if there is no configuration', () => {
      const extension = new ExportableExtension('MyExtension');
      const assignmentRule = new ExportableAssignmentRule('url');
      assignmentRule.value = 'http://example.org/StructureDefinition/MyExtension';
      extension.rules = [assignmentRule];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toEqual([assignmentRule]);
    });

    it('should remove default slicing rules from profiles', () => {
      const profile = new ExportableProfile('ProfileWithSlice');
      const discriminatorTypeRule = new ExportableCaretValueRule('extension');
      discriminatorTypeRule.caretPath = 'slicing.discriminator[0].type';
      discriminatorTypeRule.value = new FshCode('value');
      const discriminatorPathRule = new ExportableCaretValueRule('extension');
      discriminatorPathRule.caretPath = 'slicing.discriminator[0].path';
      discriminatorPathRule.value = 'url';
      const orderedRule = new ExportableCaretValueRule('extension');
      orderedRule.caretPath = 'slicing.ordered';
      orderedRule.value = false;
      const rulesRule = new ExportableCaretValueRule('extension');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      profile.rules = [
        discriminatorTypeRule,
        discriminatorPathRule,
        orderedRule,
        rulesRule,
        containsRule
      ];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(1); // Default slicing rules removed, only contains rule
      expect(profile.rules[0]).toBeInstanceOf(ExportableContainsRule);
    });

    it('should not remove non-default slicing rules from profiles (different discriminator.type)', () => {
      const profile = new ExportableProfile('ProfileWithSlice');
      const discriminatorTypeRule = new ExportableCaretValueRule('extension');
      discriminatorTypeRule.caretPath = 'slicing.discriminator[0].type';
      discriminatorTypeRule.value = new FshCode('profile'); // Non-default type
      const discriminatorPathRule = new ExportableCaretValueRule('extension');
      discriminatorPathRule.caretPath = 'slicing.discriminator[0].path';
      discriminatorPathRule.value = 'url';
      const orderedRule = new ExportableCaretValueRule('extension');
      orderedRule.caretPath = 'slicing.ordered';
      orderedRule.value = false;
      const rulesRule = new ExportableCaretValueRule('extension');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      profile.rules = [
        discriminatorTypeRule,
        discriminatorPathRule,
        orderedRule,
        rulesRule,
        containsRule
      ];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(5); // No rules removed
    });

    it('should not remove non-default slicing rules from profiles (different discriminator.path)', () => {
      const profile = new ExportableProfile('ProfileWithSlice');
      const discriminatorTypeRule = new ExportableCaretValueRule('extension');
      discriminatorTypeRule.caretPath = 'slicing.discriminator[0].type';
      discriminatorTypeRule.value = new FshCode('value');
      const discriminatorPathRule = new ExportableCaretValueRule('extension');
      discriminatorPathRule.caretPath = 'slicing.discriminator[0].path';
      discriminatorPathRule.value = 'system'; // Non-default path
      const orderedRule = new ExportableCaretValueRule('extension');
      orderedRule.caretPath = 'slicing.ordered';
      orderedRule.value = false;
      const rulesRule = new ExportableCaretValueRule('extension');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      profile.rules = [
        discriminatorTypeRule,
        discriminatorPathRule,
        orderedRule,
        rulesRule,
        containsRule
      ];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(5); // No rules removed
    });

    it('should not remove non-default slicing rules from profiles (different ordered)', () => {
      const profile = new ExportableProfile('ProfileWithSlice');
      const discriminatorTypeRule = new ExportableCaretValueRule('extension');
      discriminatorTypeRule.caretPath = 'slicing.discriminator[0].type';
      discriminatorTypeRule.value = new FshCode('value');
      const discriminatorPathRule = new ExportableCaretValueRule('extension');
      discriminatorPathRule.caretPath = 'slicing.discriminator[0].path';
      discriminatorPathRule.value = 'url';
      const orderedRule = new ExportableCaretValueRule('extension');
      orderedRule.caretPath = 'slicing.ordered';
      orderedRule.value = true; // Non-default ordered
      const rulesRule = new ExportableCaretValueRule('extension');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      profile.rules = [
        discriminatorTypeRule,
        discriminatorPathRule,
        orderedRule,
        rulesRule,
        containsRule
      ];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(5); // No rules removed
    });

    it('should not remove non-default slicing rules from profiles (different rules)', () => {
      const profile = new ExportableProfile('ProfileWithSlice');
      const discriminatorTypeRule = new ExportableCaretValueRule('extension');
      discriminatorTypeRule.caretPath = 'slicing.discriminator[0].type';
      discriminatorTypeRule.value = new FshCode('value');
      const discriminatorPathRule = new ExportableCaretValueRule('extension');
      discriminatorPathRule.caretPath = 'slicing.discriminator[0].path';
      discriminatorPathRule.value = 'url';
      const orderedRule = new ExportableCaretValueRule('extension');
      orderedRule.caretPath = 'slicing.ordered';
      orderedRule.value = false;
      const rulesRule = new ExportableCaretValueRule('extension');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('closed'); // Non-default rules
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      profile.rules = [
        discriminatorTypeRule,
        discriminatorPathRule,
        orderedRule,
        rulesRule,
        containsRule
      ];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(5); // No rules removed
    });

    it('should not remove default slicing rules from profiles if no contains rule follows', () => {
      const profile = new ExportableProfile('ProfileWithSlice');
      const discriminatorTypeRule = new ExportableCaretValueRule('extension');
      discriminatorTypeRule.caretPath = 'slicing.discriminator[0].type';
      discriminatorTypeRule.value = new FshCode('value');
      const discriminatorPathRule = new ExportableCaretValueRule('extension');
      discriminatorPathRule.caretPath = 'slicing.discriminator[0].path';
      discriminatorPathRule.value = 'url';
      const orderedRule = new ExportableCaretValueRule('extension');
      orderedRule.caretPath = 'slicing.ordered';
      orderedRule.value = false;
      const rulesRule = new ExportableCaretValueRule('extension');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      // No contains rule
      profile.rules = [discriminatorTypeRule, discriminatorPathRule, orderedRule, rulesRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(4); // No rules removed
    });

    it('should not remove default slicing from profiles when additional discriminators present', () => {
      const profile = new ExportableProfile('ProfileWithSlice');
      const defaultDiscriminatorTypeRule = new ExportableCaretValueRule('extension');
      defaultDiscriminatorTypeRule.caretPath = 'slicing.discriminator[0].type';
      defaultDiscriminatorTypeRule.value = new FshCode('value');
      const defaultDiscriminatorPathRule = new ExportableCaretValueRule('extension');
      defaultDiscriminatorPathRule.caretPath = 'slicing.discriminator[0].path';
      defaultDiscriminatorPathRule.value = 'url';
      const otherDiscriminatorTypeRule = new ExportableCaretValueRule('extension');
      otherDiscriminatorTypeRule.caretPath = 'slicing.discriminator[1].type';
      otherDiscriminatorTypeRule.value = new FshCode('profile');
      const otherDiscriminatorPathRule = new ExportableCaretValueRule('extension');
      otherDiscriminatorPathRule.caretPath = 'slicing.discriminator[1].path';
      otherDiscriminatorPathRule.value = 'system';
      const orderedRule = new ExportableCaretValueRule('extension');
      orderedRule.caretPath = 'slicing.ordered';
      orderedRule.value = false;
      const rulesRule = new ExportableCaretValueRule('extension');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      profile.rules = [
        defaultDiscriminatorTypeRule,
        defaultDiscriminatorPathRule,
        otherDiscriminatorTypeRule,
        otherDiscriminatorPathRule,
        orderedRule,
        rulesRule,
        containsRule
      ];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(7); // No rules removed
    });

    it('should remove default slicing from profiles when additional discriminators present on other paths', () => {
      const profile = new ExportableProfile('ProfileWithSlice');
      const defaultDiscriminatorTypeRule = new ExportableCaretValueRule('extension');
      defaultDiscriminatorTypeRule.caretPath = 'slicing.discriminator[0].type';
      defaultDiscriminatorTypeRule.value = new FshCode('value');
      const defaultDiscriminatorPathRule = new ExportableCaretValueRule('extension');
      defaultDiscriminatorPathRule.caretPath = 'slicing.discriminator[0].path';
      defaultDiscriminatorPathRule.value = 'url';
      const otherDiscriminatorTypeRuleA = new ExportableCaretValueRule('status.extension');
      otherDiscriminatorTypeRuleA.caretPath = 'slicing.discriminator[0].type';
      otherDiscriminatorTypeRuleA.value = new FshCode('profile');
      const otherDiscriminatorPathRuleA = new ExportableCaretValueRule('status.extension');
      otherDiscriminatorPathRuleA.caretPath = 'slicing.discriminator[0].path';
      otherDiscriminatorPathRuleA.value = 'system';
      const otherDiscriminatorTypeRuleB = new ExportableCaretValueRule('status.extension');
      otherDiscriminatorTypeRuleB.caretPath = 'slicing.discriminator[1].type';
      otherDiscriminatorTypeRuleB.value = new FshCode('profile');
      const otherDiscriminatorPathRuleB = new ExportableCaretValueRule('status.extension');
      otherDiscriminatorPathRuleB.caretPath = 'slicing.discriminator[1].path';
      otherDiscriminatorPathRuleB.value = 'system';
      const orderedRule = new ExportableCaretValueRule('extension');
      orderedRule.caretPath = 'slicing.ordered';
      orderedRule.value = false;
      const rulesRule = new ExportableCaretValueRule('extension');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      profile.rules = [
        defaultDiscriminatorTypeRule,
        defaultDiscriminatorPathRule,
        otherDiscriminatorTypeRuleA,
        otherDiscriminatorPathRuleA,
        otherDiscriminatorTypeRuleB,
        otherDiscriminatorPathRuleB,
        orderedRule,
        rulesRule,
        containsRule
      ];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(5); // Default rules on extension removed, rules on status.extension not removed
    });

    it('should not remove default slicing from profiles if any default is missing', () => {
      const profile = new ExportableProfile('ProfileWithSlice');
      const discriminatorTypeRule = new ExportableCaretValueRule('extension');
      discriminatorTypeRule.caretPath = 'slicing.discriminator[0].type';
      discriminatorTypeRule.value = new FshCode('value');
      const discriminatorPathRule = new ExportableCaretValueRule('extension');
      discriminatorPathRule.caretPath = 'slicing.discriminator[0].path';
      discriminatorPathRule.value = 'url';
      const orderedRule = new ExportableCaretValueRule('extension');
      orderedRule.caretPath = 'slicing.ordered';
      orderedRule.value = false;
      const rulesRule = new ExportableCaretValueRule('status');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open'); // Default rule on different path
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      profile.rules = [
        discriminatorTypeRule,
        discriminatorPathRule,
        orderedRule,
        rulesRule,
        containsRule
      ];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(5); // No rules removed
    });

    it('should remove default slicing on modifierExtensions on profiles', () => {
      const profile = new ExportableProfile('ProfileWithSlice');
      const discriminatorTypeRule = new ExportableCaretValueRule('modifierExtension');
      discriminatorTypeRule.caretPath = 'slicing.discriminator[0].type';
      discriminatorTypeRule.value = new FshCode('value');
      const discriminatorPathRule = new ExportableCaretValueRule('modifierExtension');
      discriminatorPathRule.caretPath = 'slicing.discriminator[0].path';
      discriminatorPathRule.value = 'url';
      const orderedRule = new ExportableCaretValueRule('modifierExtension');
      orderedRule.caretPath = 'slicing.ordered';
      orderedRule.value = false;
      const rulesRule = new ExportableCaretValueRule('modifierExtension');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const containsRule = new ExportableContainsRule('modifierExtension');
      containsRule.items.push({ name: 'foo' });
      profile.rules = [
        discriminatorTypeRule,
        discriminatorPathRule,
        orderedRule,
        rulesRule,
        containsRule
      ];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(1); // Default slicing rules removed, only contains rule
      expect(profile.rules[0]).toBeInstanceOf(ExportableContainsRule);
    });

    it('should remove default slicing on any path from profiles', () => {
      const profile = new ExportableProfile('ProfileWithSlice');
      const discriminatorTypeRule = new ExportableCaretValueRule('status.extension');
      discriminatorTypeRule.caretPath = 'slicing.discriminator[0].type';
      discriminatorTypeRule.value = new FshCode('value');
      const discriminatorPathRule = new ExportableCaretValueRule('status.extension');
      discriminatorPathRule.caretPath = 'slicing.discriminator[0].path';
      discriminatorPathRule.value = 'url';
      const orderedRule = new ExportableCaretValueRule('status.extension');
      orderedRule.caretPath = 'slicing.ordered';
      orderedRule.value = false;
      const rulesRule = new ExportableCaretValueRule('status.extension');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const containsRule = new ExportableContainsRule('status.extension');
      containsRule.items.push({ name: 'foo' });
      profile.rules = [
        discriminatorTypeRule,
        discriminatorPathRule,
        orderedRule,
        rulesRule,
        containsRule
      ];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(1); // Default slicing rules removed, only contains rule
      expect(profile.rules[0]).toBeInstanceOf(ExportableContainsRule);
    });

    it('should remove default slicing from extensions', () => {
      const extension = new ExportableExtension('ProfileWithSlice');
      const discriminatorTypeRule = new ExportableCaretValueRule('extension');
      discriminatorTypeRule.caretPath = 'slicing.discriminator[0].type';
      discriminatorTypeRule.value = new FshCode('value');
      const discriminatorPathRule = new ExportableCaretValueRule('extension');
      discriminatorPathRule.caretPath = 'slicing.discriminator[0].path';
      discriminatorPathRule.value = 'url';
      const orderedRule = new ExportableCaretValueRule('extension');
      orderedRule.caretPath = 'slicing.ordered';
      orderedRule.value = false;
      const rulesRule = new ExportableCaretValueRule('extension');
      rulesRule.caretPath = 'slicing.rules';
      rulesRule.value = new FshCode('open');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      extension.rules = [
        discriminatorTypeRule,
        discriminatorPathRule,
        orderedRule,
        rulesRule,
        containsRule
      ];
      const myPackage = new Package();
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(extension.rules).toHaveLength(1); // Default slicing rules removed, only contains rule
      expect(extension.rules[0]).toBeInstanceOf(ExportableContainsRule);
    });

    it('should remove date caret rules if date appears to be set by IG publisher', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const valueSet = new ExportableValueSet('ExtraValueSet');
      const codeSystem = new ExportableCodeSystem('ExtraCodeSystem');
      const dateCaretRule = new ExportableCaretValueRule('');
      dateCaretRule.caretPath = 'date';
      dateCaretRule.value = '2020-03-24T22:19:43+00:00';
      profile.rules = [dateCaretRule];
      extension.rules = [dateCaretRule];
      valueSet.rules = [dateCaretRule];
      codeSystem.rules = [dateCaretRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.add(extension);
      myPackage.add(valueSet);
      myPackage.add(codeSystem);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(0); // date CaretValueRule removed
      expect(extension.rules).toHaveLength(0); // date CaretValueRule removed
      expect(valueSet.rules).toHaveLength(0); // date CaretValueRule removed
      expect(codeSystem.rules).toHaveLength(0); // date CaretValueRule removed
    });

    it('should not remove date caret rules if date appears to not be set by IG publisher (different dates)', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const dateCaretRule1 = new ExportableCaretValueRule('');
      dateCaretRule1.caretPath = 'date';
      dateCaretRule1.value = '2020-12-01T04:12:06+00:00'; // different from date2
      const dateCaretRule2 = new ExportableCaretValueRule('');
      dateCaretRule2.caretPath = 'date';
      dateCaretRule2.value = '2020-03-24T22:19:43+00:00'; // different from date1
      profile.rules = [dateCaretRule1];
      extension.rules = [dateCaretRule2];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(1); // date CaretValueRule is not removed
      expect(extension.rules).toHaveLength(1); // date CaretValueRule is not removed
    });

    it('should not remove date caret rules if date appears to not be set by IG publisher (no time)', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const dateCaretRule = new ExportableCaretValueRule('');
      dateCaretRule.caretPath = 'date';
      dateCaretRule.value = '2020-03-24'; // No time specified (FHIR does not allow a time without a timezone)
      profile.rules = [dateCaretRule];
      extension.rules = [dateCaretRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(1); // date CaretValueRule is not removed
      expect(extension.rules).toHaveLength(1); // date CaretValueRule is not removed
    });

    it('should not remove date caret rules if date appears to not be set by IG publisher (different time zone)', () => {
      const extension = new ExportableExtension('ExtraExtension');
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';
      const dateCaretRule = new ExportableCaretValueRule('');
      dateCaretRule.caretPath = 'date';
      dateCaretRule.value = '2020-03-24T22:19:43+04:00'; // Different timezone, not GMT
      profile.rules = [dateCaretRule];
      extension.rules = [dateCaretRule];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.add(extension);
      myPackage.optimize(processor);
      expect(profile.rules).toHaveLength(1); // date CaretValueRule is not removed
      expect(extension.rules).toHaveLength(1); // date CaretValueRule is not removed
    });

    // combineContainsRules
    it('should combine multiple contains rules which have the same path', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';

      const containsRule1 = new ExportableContainsRule('category');
      containsRule1.items.push({ name: 'foo' });
      const cardRule1 = new ExportableCardRule('category[foo]');
      cardRule1.min = 1;
      containsRule1.cardRules.push(cardRule1);

      const containsRule2 = new ExportableContainsRule('category');
      containsRule2.items.push({ name: 'bar' });
      const cardRule2 = new ExportableCardRule('category[bar]');
      cardRule2.min = 1;
      containsRule2.cardRules.push(cardRule2);

      const containsRule3 = new ExportableContainsRule('category');
      containsRule3.items.push({ name: 'baz' });
      const cardRule3 = new ExportableCardRule('category[baz]');
      cardRule3.min = 1;
      containsRule3.cardRules.push(cardRule3);
      const flagRule3 = new ExportableFlagRule('category[baz]');
      flagRule3.mustSupport = true;
      containsRule3.flagRules.push(flagRule3);

      profile.rules = [containsRule1, containsRule2, containsRule3];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);

      const combinedContainsRule = new ExportableContainsRule('category');
      combinedContainsRule.items.push({ name: 'foo' }, { name: 'bar' }, { name: 'baz' });
      combinedContainsRule.cardRules.push(cardRule1, cardRule2, cardRule3);
      combinedContainsRule.flagRules.push(flagRule3);
      expect(profile.rules).toEqual([combinedContainsRule]);
    });

    it('should not combine multiple contains rules which have the different paths', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'Observation';

      const containsRule1 = new ExportableContainsRule('category');
      containsRule1.items.push({ name: 'foo' });
      const cardRule1 = new ExportableCardRule('category[foo]');
      cardRule1.min = 1;
      containsRule1.cardRules.push(cardRule1);

      const containsRule2 = new ExportableContainsRule('category');
      containsRule2.items.push({ name: 'bar' });
      const cardRule2 = new ExportableCardRule('category[bar]');
      cardRule2.min = 1;
      containsRule1.cardRules.push(cardRule2);

      const containsRule3 = new ExportableContainsRule('component');
      containsRule3.items.push({ name: 'baz' });
      const cardRule3 = new ExportableCardRule('component[baz]');
      cardRule3.min = 1;
      containsRule3.cardRules.push(cardRule3);
      const flagRule3 = new ExportableFlagRule('component[baz]');
      flagRule3.mustSupport = true;
      containsRule3.flagRules.push(flagRule3);

      profile.rules = [containsRule1, containsRule2, containsRule3];
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);

      const combinedContainsRule = new ExportableContainsRule('category');
      combinedContainsRule.items.push({ name: 'foo' }, { name: 'bar' });
      combinedContainsRule.cardRules.push(cardRule1, cardRule2);
      expect(profile.rules).toEqual([combinedContainsRule, containsRule3]);
    });

    // simplifyOnlyRules
    it('should replace an only rule type url with the name of a local StructureDefinition', () => {
      const profile = new ExportableProfile('MyObservation');
      const onlySubject = new ExportableOnlyRule('subject');
      onlySubject.types = [
        {
          type: 'https://demo.org/StructureDefinition/Patient',
          isReference: true
        }
      ];

      profile.rules.push(onlySubject);
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);

      const expectedSubject = new ExportableOnlyRule('subject');
      expectedSubject.types = [
        {
          type: 'Patient',
          isReference: true
        }
      ];
      expect(profile.rules).toContainEqual(expectedSubject);
    });

    it('should replace an only rule type url with the name of a core FHIR resource', () => {
      const profile = new ExportableProfile('MyObservation');
      const onlySubject = new ExportableOnlyRule('subject');
      onlySubject.types = [
        {
          type: 'http://hl7.org/fhir/StructureDefinition/Group',
          isReference: true
        }
      ];
      const onlyValue = new ExportableOnlyRule('extension[something].value[x]');
      onlyValue.types = [
        {
          type: 'http://hl7.org/fhir/StructureDefinition/Device'
        },
        {
          type: 'http://hl7.org/fhir/StructureDefinition/Medication'
        },
        {
          type: 'http://example.org/fhir/StructureDefinition/CustomComponent'
        }
      ];

      profile.rules.push(onlySubject, onlyValue);
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);

      const expectedSubject = new ExportableOnlyRule('subject');
      expectedSubject.types = [
        {
          type: 'Group',
          isReference: true
        }
      ];
      const expectedValue = new ExportableOnlyRule('extension[something].value[x]');
      expectedValue.types = [
        {
          type: 'Device'
        },
        {
          type: 'Medication'
        },
        {
          type: 'http://example.org/fhir/StructureDefinition/CustomComponent'
        }
      ];
      expect(profile.rules).toContainEqual(expectedSubject);
      expect(profile.rules).toContainEqual(expectedValue);
    });

    it('should not replace an only rule type url with the name of a core FHIR resource if it shares a name with a local StructureDefinition', () => {
      const profile = new ExportableProfile('MyObservation');
      const onlySubject = new ExportableOnlyRule('subject');
      onlySubject.types = [
        {
          type: 'http://hl7.org/fhir/StructureDefinition/Patient',
          isReference: true
        }
      ];

      profile.rules.push(onlySubject);
      const myPackage = new Package();
      myPackage.add(profile);
      myPackage.optimize(processor);

      const expectedSubject = new ExportableOnlyRule('subject');
      expectedSubject.types = [
        {
          type: 'http://hl7.org/fhir/StructureDefinition/Patient',
          isReference: true
        }
      ];
      expect(profile.rules).toContainEqual(expectedSubject);
    });
  });
});
