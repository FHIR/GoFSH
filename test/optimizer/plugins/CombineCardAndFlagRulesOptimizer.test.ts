import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import {
  ExportableCardRule,
  ExportableCombinedCardFlagRule,
  ExportableFlagRule,
  ExportableProfile
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/CombineCardAndFlagRulesOptimizer';

describe('optimizer', () => {
  describe('#combine_card_and_flag_rules', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('combine_card_and_flag_rules');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toEqual(['remove_implied_zero_zero_card_rules']);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([cardRule, flagRule]);
    });
  });
});
