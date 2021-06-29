import optimizer from '../../../src/optimizer/plugins/RemoveDefaultLogicalCaretRulesOptimizer';
import {
  ExportableLogical,
  ExportableCaretValueRule,
  ExportableConfiguration
} from '../../../src/exportable';
import { fshtypes } from 'fsh-sushi';
import { Package } from '../../../src/processor/Package';
const { FshCode } = fshtypes;

describe('optimizer', () => {
  describe('#remove_default_logical_caret_rules', () => {
    let myPackage: Package;

    beforeEach(() => {
      myPackage = new Package();
      const config = new ExportableConfiguration({
        canonical: 'http://example.org/gofsh/test',
        fhirVersion: ['4.0.1']
      });
      myPackage.add(config);
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('remove_default_logical_caret_rules_optimizer');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should remove a caret value rule on kind with the default value', () => {
      const logical = new ExportableLogical('MyLogical');
      const kindRule = new ExportableCaretValueRule('');
      kindRule.caretPath = 'kind';
      kindRule.value = new FshCode('logical');
      logical.rules.push(kindRule);

      myPackage.add(logical);
      optimizer.optimize(myPackage);
      expect(logical.rules).toHaveLength(0);
    });

    it('should remove a caret value rule on abstract with the default value', () => {
      const logical = new ExportableLogical('MyLogical');
      const abstractRule = new ExportableCaretValueRule('');
      abstractRule.caretPath = 'abstract';
      abstractRule.value = false;
      logical.rules.push(abstractRule);
      myPackage.add(logical);

      optimizer.optimize(myPackage);
      expect(logical.rules).toHaveLength(0);
    });

    it('should remove a caret value rule on type with the default value', () => {
      const typicalLogical = new ExportableLogical('TypicalLogical');
      typicalLogical.id = 'typical-logical';
      const typicalType = new ExportableCaretValueRule('');
      typicalType.caretPath = 'type';
      typicalType.value = 'http://example.org/gofsh/test/StructureDefinition/typical-logical';
      typicalLogical.rules.push(typicalType);
      myPackage.add(typicalLogical);

      const customLogical = new ExportableLogical('CustomLogical');
      const customUrl = new ExportableCaretValueRule('');
      customUrl.caretPath = 'url';
      customUrl.value = 'http://example.org/custom/a-custom-logical';
      const customType = new ExportableCaretValueRule('');
      customType.caretPath = 'type';
      customType.value = 'http://example.org/custom/a-custom-logical';
      customLogical.rules.push(customUrl, customType);
      myPackage.add(customLogical);

      optimizer.optimize(myPackage);
      expect(typicalLogical.rules).toHaveLength(0);
      expect(customLogical.rules).toHaveLength(1);
      expect(customLogical.rules[0]).toEqual(customUrl);
    });

    it('should not remove a caret value rule on type with a non-default value', () => {
      // This Logical has the typical URL, which will not match its type.
      const typicalLogical = new ExportableLogical('TypicalLogical');
      typicalLogical.id = 'typical-logical';
      const typicalType = new ExportableCaretValueRule('');
      typicalType.caretPath = 'type';
      typicalType.value = 'http://example.org/different-url/typical-logical';
      typicalLogical.rules.push(typicalType);
      myPackage.add(typicalLogical);

      // This Logical has a custom URL, but the type is different from that URL.
      const customLogical = new ExportableLogical('CustomLogical');
      const customUrl = new ExportableCaretValueRule('');
      customUrl.caretPath = 'url';
      customUrl.value = 'http://example.org/custom-url/a-custom-logical';
      const customType = new ExportableCaretValueRule('');
      customType.caretPath = 'type';
      customType.value = 'http://example.org/custom-type/a-custom-logical';
      customLogical.rules.push(customUrl, customType);
      myPackage.add(customLogical);

      optimizer.optimize(myPackage);
      expect(typicalLogical.rules).toHaveLength(1);
      expect(customLogical.rules).toHaveLength(2);
    });
  });
});
