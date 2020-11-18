import { fshtypes } from 'fsh-sushi';
import { Package } from '../../../src/processor/Package';
import optimizer from '../../../src/optimizer/plugins/CombineCodingAndQuantityValuesOptimizer';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableCaretValueRule
} from '../../../src/exportable';

const { FshCode, FshQuantity } = fshtypes;

describe('optimizer', () => {
  describe('#combine_coding_and_quantity_values', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('combine_coding_and_quantity_values');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    describe('#CaretRules', () => {
      // caret value rule tests with profiles and extensions
      it('should combine rules on code and system into a single rule', () => {
        const profile = new ExportableProfile('MyProfile');
        const codeRule = new ExportableCaretValueRule('');
        codeRule.caretPath = 'extension[0].valueCoding.code';
        codeRule.value = new FshCode('raspberry');
        const systemRule = new ExportableCaretValueRule('');
        systemRule.caretPath = 'extension[0].valueCoding.system';
        systemRule.value = 'https://fruit.net/CodeSystems/FruitCS';
        profile.rules.push(codeRule, systemRule);
        const myPackage = new Package();
        myPackage.add(profile);

        const expectedRule = new ExportableCaretValueRule('');
        expectedRule.caretPath = 'extension[0].valueCoding';
        expectedRule.value = new FshCode('raspberry', 'https://fruit.net/CodeSystems/FruitCS');
        optimizer.optimize(myPackage);
        expect(profile.rules.length).toBe(1);
        expect(profile.rules[0]).toEqual(expectedRule);
      });

      it('should combine rules on code and display into a single rule', () => {
        const profile = new ExportableProfile('MyProfile');
        const codeRule = new ExportableCaretValueRule('');
        codeRule.caretPath = 'extension[1].valueCoding.code';
        codeRule.value = new FshCode('raspberry');
        const displayRule = new ExportableCaretValueRule('');
        displayRule.caretPath = 'extension[1].valueCoding.display';
        displayRule.value = 'fresh, delicious raspberries';
        profile.rules.push(codeRule, displayRule);
        const myPackage = new Package();
        myPackage.add(profile);

        const expectedRule = new ExportableCaretValueRule('');
        expectedRule.caretPath = 'extension[1].valueCoding';
        expectedRule.value = new FshCode('raspberry', undefined, 'fresh, delicious raspberries');
        optimizer.optimize(myPackage);
        expect(profile.rules.length).toBe(1);
        expect(profile.rules[0]).toEqual(expectedRule);
      });

      it('should combine rules on code, system, and display into a single rule', () => {
        const profile = new ExportableProfile('MyProfile');
        const codeRule = new ExportableCaretValueRule('note');
        codeRule.caretPath = 'extension[0].valueCoding.code';
        codeRule.value = new FshCode('raspberry');
        const systemRule = new ExportableCaretValueRule('note');
        systemRule.caretPath = 'extension[0].valueCoding.system';
        systemRule.value = 'https://fruit.net/CodeSystems/FruitCS';
        const displayRule = new ExportableCaretValueRule('note');
        displayRule.caretPath = 'extension[0].valueCoding.display';
        displayRule.value = 'fresh, delicious raspberries';
        profile.rules.push(codeRule, systemRule, displayRule);
        const myPackage = new Package();
        myPackage.add(profile);

        const expectedRule = new ExportableCaretValueRule('note');
        expectedRule.caretPath = 'extension[0].valueCoding';
        expectedRule.value = new FshCode(
          'raspberry',
          'https://fruit.net/CodeSystems/FruitCS',
          'fresh, delicious raspberries'
        );
        optimizer.optimize(myPackage);
        expect(profile.rules.length).toBe(1);
        expect(profile.rules[0]).toEqual(expectedRule);
      });

      it('should combine rules on code, system, and unit into a single rule', () => {
        const extension = new ExportableExtension('MyExtension');
        const codeRule = new ExportableCaretValueRule('');
        codeRule.caretPath = 'extension[0].valueQuantity.code';
        codeRule.value = new FshCode('GW');
        const systemRule = new ExportableCaretValueRule('');
        systemRule.caretPath = 'extension[0].valueQuantity.system';
        systemRule.value = 'http://unitsofmeasure.org';
        const unitRule = new ExportableCaretValueRule('');
        unitRule.caretPath = 'extension[0].valueQuantity.unit';
        unitRule.value = 'Gigawatts';
        extension.rules.push(codeRule, systemRule, unitRule);
        const myPackage = new Package();
        myPackage.add(extension);

        const expectedRule = new ExportableCaretValueRule('');
        expectedRule.caretPath = 'extension[0].valueQuantity';
        expectedRule.value = new FshCode('GW', 'http://unitsofmeasure.org', 'Gigawatts');
        optimizer.optimize(myPackage);
        expect(extension.rules.length).toBe(1);
        expect(extension.rules[0]).toEqual(expectedRule);
      });

      it('should combine rules on code, system, and value into a single rule when the system is http://unitsofmeasure.org', () => {
        const extension = new ExportableExtension('MyExtension');
        const codeRule = new ExportableCaretValueRule('');
        codeRule.caretPath = 'extension[0].valueQuantity.code';
        codeRule.value = new FshCode('GW');
        const systemRule = new ExportableCaretValueRule('');
        systemRule.caretPath = 'extension[0].valueQuantity.system';
        systemRule.value = 'http://unitsofmeasure.org';
        const valueRule = new ExportableCaretValueRule('');
        valueRule.caretPath = 'extension[0].valueQuantity.value';
        valueRule.value = 1.21;
        extension.rules.push(codeRule, systemRule, valueRule);
        const myPackage = new Package();
        myPackage.add(extension);

        const expectedRule = new ExportableCaretValueRule('');
        expectedRule.caretPath = 'extension[0].valueQuantity';
        expectedRule.value = new FshQuantity(1.21, new FshCode('GW', 'http://unitsofmeasure.org'));
        optimizer.optimize(myPackage);
        expect(extension.rules.length).toBe(1);
        expect(extension.rules[0]).toEqual(expectedRule);
      });

      it('should combine rules on code and system when value is available but the system is not http://unitsofmeasure.org', () => {
        const extension = new ExportableExtension('MyExtension');
        const codeRule = new ExportableCaretValueRule('');
        codeRule.caretPath = 'extension[0].valueQuantity.code';
        codeRule.value = new FshCode('GW');
        const systemRule = new ExportableCaretValueRule('');
        systemRule.caretPath = 'extension[0].valueQuantity.system';
        systemRule.value = 'http://different-units.org';
        const valueRule = new ExportableCaretValueRule('');
        valueRule.caretPath = 'extension[0].valueQuantity.value';
        valueRule.value = 1.21;
        extension.rules.push(codeRule, systemRule, valueRule);
        const myPackage = new Package();
        myPackage.add(extension);

        const expectedRule = new ExportableCaretValueRule('');
        expectedRule.caretPath = 'extension[0].valueQuantity';
        expectedRule.value = new FshCode('GW', 'http://different-units.org');
        optimizer.optimize(myPackage);
        expect(extension.rules.length).toBe(2);
        expect(extension.rules).toContainEqual(valueRule);
        expect(extension.rules).toContainEqual(expectedRule);
      });

      it('should prefer combining code, system, and unit, even when value is available', () => {
        const extension = new ExportableExtension('MyExtension');
        const codeRule = new ExportableCaretValueRule('');
        codeRule.caretPath = 'extension[0].valueQuantity.code';
        codeRule.value = new FshCode('GW');
        const systemRule = new ExportableCaretValueRule('');
        systemRule.caretPath = 'extension[0].valueQuantity.system';
        systemRule.value = 'http://unitsofmeasure.org';
        const valueRule = new ExportableCaretValueRule('');
        valueRule.caretPath = 'extension[0].valueQuantity.value';
        valueRule.value = 1.21;
        const unitRule = new ExportableCaretValueRule('');
        unitRule.caretPath = 'extension[0].valueQuantity.unit';
        unitRule.value = 'Gigawatts';
        extension.rules.push(codeRule, systemRule, valueRule, unitRule);
        const myPackage = new Package();
        myPackage.add(extension);

        const expectedRule = new ExportableCaretValueRule('');
        expectedRule.caretPath = 'extension[0].valueQuantity';
        expectedRule.value = new FshCode('GW', 'http://unitsofmeasure.org', 'Gigawatts');
        optimizer.optimize(myPackage);
        expect(extension.rules.length).toBe(2);
        expect(extension.rules).toContainEqual(valueRule);
        expect(extension.rules).toContainEqual(expectedRule);
      });

      it('should not combine rules that have sibling caretPaths, but different paths', () => {
        const profile = new ExportableProfile('MyProfile');
        const codeRule = new ExportableCaretValueRule('note');
        codeRule.caretPath = 'extension[1].valueCoding.code';
        codeRule.value = new FshCode('raspberry');
        const displayRule = new ExportableCaretValueRule('');
        displayRule.caretPath = 'extension[1].valueCoding.display';
        displayRule.value = 'fresh, delicious raspberries';
        profile.rules.push(codeRule, displayRule);
        const myPackage = new Package();
        myPackage.add(profile);

        optimizer.optimize(myPackage);
        expect(profile.rules.length).toBe(2);
        expect(profile.rules[0]).toBe(codeRule);
        expect(profile.rules[1]).toBe(displayRule);
      });

      it('should not combine rules that have the same path, but non-sibling caretPaths', () => {
        const profile = new ExportableProfile('MyProfile');
        const codeRule = new ExportableCaretValueRule('');
        codeRule.caretPath = 'extension[1].valueCoding.code';
        codeRule.value = new FshCode('raspberry');
        const displayRule = new ExportableCaretValueRule('');
        displayRule.caretPath = 'extension[2].valueCoding.display';
        displayRule.value = 'fresh, delicious raspberries';
        profile.rules.push(codeRule, displayRule);
        const myPackage = new Package();
        myPackage.add(profile);

        optimizer.optimize(myPackage);
        expect(profile.rules.length).toBe(2);
        expect(profile.rules[0]).toBe(codeRule);
        expect(profile.rules[1]).toBe(displayRule);
      });
    });

    describe('#AssignmentRules', () => {
      // assignment rule tests with instances
    });
  });
});
