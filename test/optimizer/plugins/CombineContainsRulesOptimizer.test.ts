import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import {
  ExportableCardRule,
  ExportableContainsRule,
  ExportableFlagRule,
  ExportableProfile
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/CombineContainsRulesOptimizer';

describe('optimizer', () => {
  describe('#combine_contains_rules', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('combine_contains_rules');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toEqual(['construct_named_extension_contains_rules']);
    });

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
      optimizer.optimize(myPackage);

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
      optimizer.optimize(myPackage);

      const combinedContainsRule = new ExportableContainsRule('category');
      combinedContainsRule.items.push({ name: 'foo' }, { name: 'bar' });
      combinedContainsRule.cardRules.push(cardRule1, cardRule2);
      expect(profile.rules).toEqual([combinedContainsRule, containsRule3]);
    });
  });
});
