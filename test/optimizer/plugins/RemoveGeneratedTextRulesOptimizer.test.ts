import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { fshtypes } from 'fsh-sushi';
import { Package } from '../../../src/processor';
import {
  ExportableCaretValueRule,
  ExportableProfile,
  ExportableValueSet
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/RemoveGeneratedTextRulesOptimizer';

describe('optimizer', () => {
  describe('#remove_generated_text_rules', () => {
    let statusRule: ExportableCaretValueRule;
    let divRule: ExportableCaretValueRule;
    let rulesRule: ExportableCaretValueRule;

    beforeEach(() => {
      statusRule = new ExportableCaretValueRule('');
      statusRule.caretPath = 'text.status';
      statusRule.value = new fshtypes.FshCode('generated');
      divRule = new ExportableCaretValueRule('');
      divRule.caretPath = 'text.div';
      divRule.value = '<div xmlns="http://www.w3.org/1999/xhtml">text</div>';
      rulesRule = new ExportableCaretValueRule('');
      rulesRule.caretPath = 'implicitRules';
      rulesRule.value = 'http://rules.com';
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('remove_generated_text_rules');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should remove ^text rules when text.status is #generated on a Profile', () => {
      const profile = new ExportableProfile('Foo');
      profile.rules = [statusRule, divRule, rulesRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([rulesRule]);
    });

    it('should remove ^text rules when text.status is #generated on a ValueSet', () => {
      const vs = new ExportableValueSet('Foo');
      vs.rules = [statusRule, divRule, rulesRule];
      const myPackage = new Package();
      myPackage.add(vs);
      optimizer.optimize(myPackage);
      expect(vs.rules).toEqual([rulesRule]);
    });

    it('should remove ^text rules when text.status is #generated on a CodeSystem', () => {
      const cs = new ExportableValueSet('Foo');
      cs.rules = [statusRule, divRule, rulesRule];
      const myPackage = new Package();
      myPackage.add(cs);
      optimizer.optimize(myPackage);
      expect(cs.rules).toEqual([rulesRule]);
    });

    it('should remove ^text rules when text.status is #extensions on a Profile', () => {
      const profile = new ExportableProfile('Foo');
      statusRule.value = new fshtypes.FshCode('extensions');
      profile.rules = [statusRule, divRule, rulesRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([rulesRule]);
    });

    it('should not remove ^text rules when text.status is neither #extensions or #generated on a Profile', () => {
      const profile = new ExportableProfile('Foo');
      statusRule.value = new fshtypes.FshCode('additional');
      profile.rules = [statusRule, divRule, rulesRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([statusRule, divRule, rulesRule]);
    });
  });
});