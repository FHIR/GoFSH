import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import {
  ExportableBindingRule,
  ExportableCardRule,
  ExportableContainsRule,
  ExportableExtension,
  ExportableOnlyRule,
  ExportableProfile
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/RemoveImpliedZeroZeroCardRulesOptimizer';

describe('optimizer', () => {
  describe('#remove_implied_zero_zero_card_rules', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('remove_implied_zero_zero_card_rules');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([valueRule, extRule]);
    });
  });
});
