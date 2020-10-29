import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import {
  ExportableCaretValueRule,
  ExportableContainsRule,
  ExportableExtension,
  ExportableProfile
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/RemoveExtensionSlicingRulesOptimizer';
import { fshtypes } from 'fsh-sushi';
const { FshCode } = fshtypes;

describe('optimizer', () => {
  describe('#remove_extension_slicing_rules', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('remove_extension_slicing_rules');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
      expect(extension.rules).toHaveLength(1); // Default slicing rules removed, only contains rule
      expect(extension.rules[0]).toBeInstanceOf(ExportableContainsRule);
    });
  });
});
