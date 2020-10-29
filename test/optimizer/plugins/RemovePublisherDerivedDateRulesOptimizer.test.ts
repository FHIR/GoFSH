import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import {
  ExportableCaretValueRule,
  ExportableCodeSystem,
  ExportableExtension,
  ExportableProfile,
  ExportableValueSet
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/RemovePublisherDerivedDateRulesOptimizer';

describe('optimizer', () => {
  describe('#remove_publisher_derived_date_rules', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('remove_publisher_derived_date_rules');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
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
      optimizer.optimize(myPackage);
      expect(profile.rules).toHaveLength(1); // date CaretValueRule is not removed
      expect(extension.rules).toHaveLength(1); // date CaretValueRule is not removed
    });
  });
});
