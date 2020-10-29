import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import {
  ExportableCaretValueRule,
  ExportableExtension,
  ExportableProfile
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/RemoveDefaultExtensionContextRulesOptimizer';
import { fshtypes } from 'fsh-sushi';
const { FshCode } = fshtypes;

describe('optimizer', () => {
  describe('#remove_default_extension_context_rules', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('remove_default_extension_context_rules');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
      expect(profile.rules).toHaveLength(2);
    });
  });
});
