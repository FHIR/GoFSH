import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import {
  ExportableContainsRule,
  ExportableFlagRule,
  ExportableOnlyRule,
  ExportableProfile
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/ConstructNamedExtensionContainsRulesOptimizer';

describe('optimizer', () => {
  describe('#construct_named_extension_contains_rules', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('construct_named_extension_contains_rules');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toEqual(['resolve_only_rule_urls']);
    });

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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
      // nothing should change
      expect(profile.rules).toEqual([containsRule, onlyRule]);
    });
  });
});
