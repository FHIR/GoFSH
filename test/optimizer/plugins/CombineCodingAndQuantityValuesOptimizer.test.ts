import { fshtypes } from 'fsh-sushi';
import { Package } from '../../../src/processor/Package';
import optimizer from '../../../src/optimizer/plugins/CombineCodingAndQuantityValuesOptimizer';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableCaretValueRule,
  ExportableInstance,
  ExportableAssignmentRule
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

      it('should move the combined rule to the parent CodeableConcept when the rule is on the child coding[0] and there are no other rules on the child', () => {
        const profile = new ExportableProfile('MyProfile');
        const codeRule = new ExportableCaretValueRule('note');
        codeRule.caretPath = 'extension[0].valueCodeableConcept.coding[0].code';
        codeRule.value = new FshCode('raspberry');
        const systemRule = new ExportableCaretValueRule('note');
        systemRule.caretPath = 'extension[0].valueCodeableConcept.coding[0].system';
        systemRule.value = 'https://fruit.net/CodeSystems/FruitCS';
        const displayRule = new ExportableCaretValueRule('note');
        displayRule.caretPath = 'extension[0].valueCodeableConcept.coding[0].display';
        displayRule.value = 'fresh, delicious raspberries';
        profile.rules.push(codeRule, systemRule, displayRule);
        const myPackage = new Package();
        myPackage.add(profile);

        const expectedRule = new ExportableCaretValueRule('note');
        expectedRule.caretPath = 'extension[0].valueCodeableConcept';
        expectedRule.value = new FshCode(
          'raspberry',
          'https://fruit.net/CodeSystems/FruitCS',
          'fresh, delicious raspberries'
        );
        optimizer.optimize(myPackage);
        expect(profile.rules.length).toBe(1);
        expect(profile.rules[0]).toEqual(expectedRule);
      });

      it('should not move the combined rule to the parent CodeableConcept when it has more than one coding', () => {
        const profile = new ExportableProfile('MyProfile');
        const codeRule = new ExportableCaretValueRule('note');
        codeRule.caretPath = 'extension[0].valueCodeableConcept.coding[0].code';
        codeRule.value = new FshCode('raspberry');
        const systemRule = new ExportableCaretValueRule('note');
        systemRule.caretPath = 'extension[0].valueCodeableConcept.coding[0].system';
        systemRule.value = 'https://fruit.net/CodeSystems/FruitCS';
        const displayRule = new ExportableCaretValueRule('note');
        displayRule.caretPath = 'extension[0].valueCodeableConcept.coding[0].display';
        displayRule.value = 'fresh, delicious raspberries';
        const secondCodeRule = new ExportableCaretValueRule('note');
        secondCodeRule.caretPath = 'extension[0].valueCodeableConcept.coding[1].code';
        secondCodeRule.value = new FshCode('strawberry');
        profile.rules.push(codeRule, systemRule, displayRule, secondCodeRule);
        const myPackage = new Package();
        myPackage.add(profile);

        const expectedRule = new ExportableCaretValueRule('note');
        expectedRule.caretPath = 'extension[0].valueCodeableConcept.coding[0]';
        expectedRule.value = new FshCode(
          'raspberry',
          'https://fruit.net/CodeSystems/FruitCS',
          'fresh, delicious raspberries'
        );
        optimizer.optimize(myPackage);
        expect(profile.rules.length).toBe(2);
        expect(profile.rules[0]).toEqual(expectedRule);
        expect(profile.rules[1]).toEqual(secondCodeRule);
      });

      it('should not move the combined rule to the parent CodeableConcept when there are additional rules on the coding', () => {
        const profile = new ExportableProfile('MyProfile');
        const codeRule = new ExportableCaretValueRule('note');
        codeRule.caretPath = 'extension[0].valueCodeableConcept.coding[0].code';
        codeRule.value = new FshCode('raspberry');
        const systemRule = new ExportableCaretValueRule('note');
        systemRule.caretPath = 'extension[0].valueCodeableConcept.coding[0].system';
        systemRule.value = 'https://fruit.net/CodeSystems/FruitCS';
        const displayRule = new ExportableCaretValueRule('note');
        displayRule.caretPath = 'extension[0].valueCodeableConcept.coding[0].display';
        displayRule.value = 'fresh, delicious raspberries';
        const idRule = new ExportableCaretValueRule('note');
        idRule.caretPath = 'extension[0].valueCodeableConcept.coding[0].id';
        idRule.value = 'SecretElementIdentifier';

        profile.rules.push(codeRule, systemRule, displayRule, idRule);
        const myPackage = new Package();
        myPackage.add(profile);

        const expectedRule = new ExportableCaretValueRule('note');
        expectedRule.caretPath = 'extension[0].valueCodeableConcept.coding[0]';
        expectedRule.value = new FshCode(
          'raspberry',
          'https://fruit.net/CodeSystems/FruitCS',
          'fresh, delicious raspberries'
        );
        optimizer.optimize(myPackage);
        expect(profile.rules.length).toBe(2);
        expect(profile.rules[0]).toEqual(expectedRule);
        expect(profile.rules[1]).toEqual(idRule);
      });

      it('should combine rules on code and unit into a single rule', () => {
        const extension = new ExportableExtension('MyExtension');
        const codeRule = new ExportableCaretValueRule('');
        codeRule.caretPath = 'extension[0].valueQuantity.code';
        codeRule.value = new FshCode('GW');
        const unitRule = new ExportableCaretValueRule('');
        unitRule.caretPath = 'extension[0].valueQuantity.unit';
        unitRule.value = 'Gigawatts';
        extension.rules.push(codeRule, unitRule);
        const myPackage = new Package();
        myPackage.add(extension);

        const expectedRule = new ExportableCaretValueRule('');
        expectedRule.caretPath = 'extension[0].valueQuantity';
        expectedRule.value = new FshCode('GW', undefined, 'Gigawatts');
        optimizer.optimize(myPackage);
        expect(extension.rules.length).toBe(1);
        expect(extension.rules[0]).toEqual(expectedRule);
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

      it('should not combine rules on code and value when system is not available', () => {
        const extension = new ExportableExtension('MyExtension');
        const codeRule = new ExportableCaretValueRule('');
        codeRule.caretPath = 'extension[0].valueQuantity.code';
        codeRule.value = new FshCode('GW');
        const valueRule = new ExportableCaretValueRule('');
        valueRule.caretPath = 'extension[0].valueQuantity.value';
        valueRule.value = 1.21;
        extension.rules.push(codeRule, valueRule);
        const myPackage = new Package();
        myPackage.add(extension);

        optimizer.optimize(myPackage);
        expect(extension.rules.length).toBe(2);
        expect(extension.rules).toContainEqual(codeRule);
        expect(extension.rules).toContainEqual(valueRule);
      });

      it('should prefer combining code, system, and value, even when unit is available, if system is http://unitsofmeasure.org', () => {
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
        expectedRule.value = new FshQuantity(1.21, new FshCode('GW', 'http://unitsofmeasure.org'));
        optimizer.optimize(myPackage);
        expect(extension.rules.length).toBe(2);
        expect(extension.rules).toContainEqual(expectedRule);
        expect(extension.rules).toContainEqual(unitRule);
      });

      it('should combine rules on code, system, and unit when value is available, but system is not http://unitsofmeasure.org', () => {
        const extension = new ExportableExtension('MyExtension');
        const codeRule = new ExportableCaretValueRule('');
        codeRule.caretPath = 'extension[0].valueQuantity.code';
        codeRule.value = new FshCode('GW');
        const systemRule = new ExportableCaretValueRule('');
        systemRule.caretPath = 'extension[0].valueQuantity.system';
        systemRule.value = 'http://other-units.org';
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
        expectedRule.value = new FshCode('GW', 'http://other-units.org', 'Gigawatts');
        optimizer.optimize(myPackage);
        expect(extension.rules.length).toBe(2);
        expect(extension.rules).toContainEqual(expectedRule);
        expect(extension.rules).toContainEqual(valueRule);
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
      it('should combine rules on code and system into a single rule', () => {
        const instance = new ExportableInstance('MyProfile');
        instance.instanceOf = 'Questionnaire';
        const codeRule = new ExportableAssignmentRule('code.code');
        codeRule.value = new FshCode('gooseberry');
        const systemRule = new ExportableAssignmentRule('code.system');
        systemRule.value = 'https://fruit.net/CodeSystems/FruitCS';
        instance.rules.push(codeRule, systemRule);
        const myPackage = new Package();
        myPackage.add(instance);

        const expectedRule = new ExportableAssignmentRule('code');
        expectedRule.value = new FshCode('gooseberry', 'https://fruit.net/CodeSystems/FruitCS');
        optimizer.optimize(myPackage);
        expect(instance.rules.length).toBe(1);
        expect(instance.rules[0]).toEqual(expectedRule);
      });

      it('should combine rules on code and display into a single rule', () => {
        const instance = new ExportableInstance('MyProfile');
        instance.instanceOf = 'Questionnaire';
        const codeRule = new ExportableAssignmentRule('code.code');
        codeRule.value = new FshCode('gooseberry');
        const displayRule = new ExportableAssignmentRule('code.display');
        displayRule.value = 'the goose is loose';
        instance.rules.push(codeRule, displayRule);
        const myPackage = new Package();
        myPackage.add(instance);

        const expectedRule = new ExportableAssignmentRule('code');
        expectedRule.value = new FshCode('gooseberry', undefined, 'the goose is loose');
        optimizer.optimize(myPackage);
        expect(instance.rules.length).toBe(1);
        expect(instance.rules[0]).toEqual(expectedRule);
      });

      it('should combine rules on code, system, and display into a single rule', () => {
        const instance = new ExportableInstance('MyProfile');
        instance.instanceOf = 'Questionnaire';
        const codeRule = new ExportableAssignmentRule('code.code');
        codeRule.value = new FshCode('gooseberry');
        const systemRule = new ExportableAssignmentRule('code.system');
        systemRule.value = 'https://fruit.net/CodeSystems/FruitCS';
        const displayRule = new ExportableAssignmentRule('code.display');
        displayRule.value = 'the goose is loose';
        instance.rules.push(codeRule, systemRule, displayRule);
        const myPackage = new Package();
        myPackage.add(instance);

        const expectedRule = new ExportableAssignmentRule('code');
        expectedRule.value = new FshCode(
          'gooseberry',
          'https://fruit.net/CodeSystems/FruitCS',
          'the goose is loose'
        );
        optimizer.optimize(myPackage);
        expect(instance.rules.length).toBe(1);
        expect(instance.rules[0]).toEqual(expectedRule);
      });

      it('should move the combined rule to the parent CodeableConcept when the rule is on the child coding[0] and there are no other rules on the child', () => {
        const instance = new ExportableInstance('MyProfile');
        instance.instanceOf = 'Observation';
        const codeRule = new ExportableAssignmentRule('category.coding[0].code');
        codeRule.value = new FshCode('gooseberry');
        const systemRule = new ExportableAssignmentRule('category.coding[0].system');
        systemRule.value = 'https://fruit.net/CodeSystems/FruitCS';
        const displayRule = new ExportableAssignmentRule('category.coding[0].display');
        displayRule.value = 'the goose is loose';
        instance.rules.push(codeRule, systemRule, displayRule);
        const myPackage = new Package();
        myPackage.add(instance);

        const expectedRule = new ExportableAssignmentRule('category');
        expectedRule.value = new FshCode(
          'gooseberry',
          'https://fruit.net/CodeSystems/FruitCS',
          'the goose is loose'
        );
        optimizer.optimize(myPackage);
        expect(instance.rules.length).toBe(1);
        expect(instance.rules[0]).toEqual(expectedRule);
      });

      it('should not move the combined rule to the parent CodeableConcept when it has more than one coding', () => {
        const instance = new ExportableInstance('MyProfile');
        instance.instanceOf = 'Observation';
        const codeRule = new ExportableAssignmentRule('category.coding[0].code');
        codeRule.value = new FshCode('gooseberry');
        const systemRule = new ExportableAssignmentRule('category.coding[0].system');
        systemRule.value = 'https://fruit.net/CodeSystems/FruitCS';
        const displayRule = new ExportableAssignmentRule('category.coding[0].display');
        displayRule.value = 'the goose is loose';
        const secondCodeRule = new ExportableAssignmentRule('category.coding[1].code');
        secondCodeRule.value = 'strawberry';
        instance.rules.push(codeRule, systemRule, displayRule, secondCodeRule);
        const myPackage = new Package();
        myPackage.add(instance);

        const expectedRule = new ExportableAssignmentRule('category.coding[0]');
        expectedRule.value = new FshCode(
          'gooseberry',
          'https://fruit.net/CodeSystems/FruitCS',
          'the goose is loose'
        );
        optimizer.optimize(myPackage);
        expect(instance.rules.length).toBe(2);
        expect(instance.rules[0]).toEqual(expectedRule);
        expect(instance.rules[1]).toEqual(secondCodeRule);
      });

      it('should not move the combined rule to the parent CodeableConcept when there are additional rules on the coding', () => {
        const instance = new ExportableInstance('MyProfile');
        instance.instanceOf = 'Observation';
        const codeRule = new ExportableAssignmentRule('category.coding[0].code');
        codeRule.value = new FshCode('gooseberry');
        const systemRule = new ExportableAssignmentRule('category.coding[0].system');
        systemRule.value = 'https://fruit.net/CodeSystems/FruitCS';
        const displayRule = new ExportableAssignmentRule('category.coding[0].display');
        displayRule.value = 'the goose is loose';
        const idRule = new ExportableAssignmentRule('category.coding[0].id');
        idRule.value = 'ExtraElementIdentifier';
        instance.rules.push(codeRule, systemRule, displayRule, idRule);
        const myPackage = new Package();
        myPackage.add(instance);

        const expectedRule = new ExportableAssignmentRule('category.coding[0]');
        expectedRule.value = new FshCode(
          'gooseberry',
          'https://fruit.net/CodeSystems/FruitCS',
          'the goose is loose'
        );
        optimizer.optimize(myPackage);
        expect(instance.rules.length).toBe(2);
        expect(instance.rules[0]).toEqual(expectedRule);
        expect(instance.rules[1]).toEqual(idRule);
      });

      it('should combine rules on code and unit into a single rule', () => {
        const instance = new ExportableInstance('MyProfile');
        instance.instanceOf = 'Observation';
        const codeRule = new ExportableAssignmentRule('referenceRange.low.code');
        codeRule.value = new FshCode('Cal');
        const unitRule = new ExportableAssignmentRule('referenceRange.low.unit');
        unitRule.value = 'nutrition label Calories';
        instance.rules.push(codeRule, unitRule);
        const myPackage = new Package();
        myPackage.add(instance);

        const expectedRule = new ExportableAssignmentRule('referenceRange.low');
        expectedRule.value = new FshCode('Cal', undefined, 'nutrition label Calories');
        optimizer.optimize(myPackage);
        expect(instance.rules.length).toBe(1);
        expect(instance.rules[0]).toEqual(expectedRule);
      });

      it('should combine rules on code, system, and unit into a single rule', () => {
        const instance = new ExportableInstance('MyProfile');
        instance.instanceOf = 'Observation';
        const codeRule = new ExportableAssignmentRule('referenceRange.low.code');
        codeRule.value = new FshCode('Cal');
        const systemRule = new ExportableAssignmentRule('referenceRange.low.system');
        systemRule.value = 'http://unitsofmeasure.org';
        const unitRule = new ExportableAssignmentRule('referenceRange.low.unit');
        unitRule.value = 'nutrition label Calories';
        instance.rules.push(codeRule, systemRule, unitRule);
        const myPackage = new Package();
        myPackage.add(instance);

        const expectedRule = new ExportableAssignmentRule('referenceRange.low');
        expectedRule.value = new FshCode(
          'Cal',
          'http://unitsofmeasure.org',
          'nutrition label Calories'
        );
        optimizer.optimize(myPackage);
        expect(instance.rules.length).toBe(1);
        expect(instance.rules[0]).toEqual(expectedRule);
      });

      it('should combine rules on code, system, and value into a single rule when the system is http://unitsofmeasure.org', () => {
        const instance = new ExportableInstance('MyProfile');
        instance.instanceOf = 'Observation';
        const codeRule = new ExportableAssignmentRule('referenceRange.low.code');
        codeRule.value = new FshCode('Cal');
        const systemRule = new ExportableAssignmentRule('referenceRange.low.system');
        systemRule.value = 'http://unitsofmeasure.org';
        const valueRule = new ExportableAssignmentRule('referenceRange.low.value');
        valueRule.value = 6;
        instance.rules.push(codeRule, systemRule, valueRule);
        const myPackage = new Package();
        myPackage.add(instance);

        const expectedRule = new ExportableAssignmentRule('referenceRange.low');
        expectedRule.value = new FshQuantity(6, new FshCode('Cal', 'http://unitsofmeasure.org'));
        optimizer.optimize(myPackage);
        expect(instance.rules.length).toBe(1);
        expect(instance.rules[0]).toEqual(expectedRule);
      });

      it('should combine rules on code and system when value is available but the system is not http://unitsofmeasure.org', () => {
        const instance = new ExportableInstance('MyProfile');
        instance.instanceOf = 'Observation';
        const codeRule = new ExportableAssignmentRule('referenceRange.low.code');
        codeRule.value = new FshCode('Cal');
        const systemRule = new ExportableAssignmentRule('referenceRange.low.system');
        systemRule.value = 'http://mystery-system.org';
        const valueRule = new ExportableAssignmentRule('referenceRange.low.value');
        valueRule.value = 6;
        instance.rules.push(codeRule, systemRule, valueRule);
        const myPackage = new Package();
        myPackage.add(instance);

        const expectedRule = new ExportableAssignmentRule('referenceRange.low');
        expectedRule.value = new FshCode('Cal', 'http://mystery-system.org');
        optimizer.optimize(myPackage);
        expect(instance.rules.length).toBe(2);
        expect(instance.rules).toContainEqual(valueRule);
        expect(instance.rules).toContainEqual(expectedRule);
      });

      it('should not combine rules on code and value when system is not available', () => {
        const instance = new ExportableInstance('MyProfile');
        instance.instanceOf = 'Observation';
        const codeRule = new ExportableAssignmentRule('referenceRange.low.code');
        codeRule.value = new FshCode('Cal');
        const valueRule = new ExportableAssignmentRule('referenceRange.low.value');
        valueRule.value = 6;
        instance.rules.push(codeRule, valueRule);
        const myPackage = new Package();
        myPackage.add(instance);

        optimizer.optimize(myPackage);
        expect(instance.rules.length).toBe(2);
        expect(instance.rules).toContainEqual(codeRule);
        expect(instance.rules).toContainEqual(valueRule);
      });

      it('should prefer combining code, system, and value, even when unit is available, if system is http://unitsofmeasure.org', () => {
        const instance = new ExportableInstance('MyProfile');
        instance.instanceOf = 'Observation';
        const codeRule = new ExportableAssignmentRule('referenceRange.low.code');
        codeRule.value = new FshCode('Cal');
        const systemRule = new ExportableAssignmentRule('referenceRange.low.system');
        systemRule.value = 'http://unitsofmeasure.org';
        const valueRule = new ExportableAssignmentRule('referenceRange.low.value');
        valueRule.value = 6;
        const unitRule = new ExportableAssignmentRule('referenceRange.low.unit');
        unitRule.value = 'nutrition label Calories';
        instance.rules.push(codeRule, systemRule, valueRule, unitRule);
        const myPackage = new Package();
        myPackage.add(instance);

        const expectedRule = new ExportableAssignmentRule('referenceRange.low');
        expectedRule.value = new FshQuantity(6, new FshCode('Cal', 'http://unitsofmeasure.org'));
        optimizer.optimize(myPackage);
        expect(instance.rules.length).toBe(2);
        expect(instance.rules).toContainEqual(expectedRule);
        expect(instance.rules).toContainEqual(unitRule);
      });

      it('should combine rules on code, system, and unit when value is available, but system is not http://unitsofmeasure.org', () => {
        const instance = new ExportableInstance('MyProfile');
        instance.instanceOf = 'Observation';
        const codeRule = new ExportableAssignmentRule('referenceRange.low.code');
        codeRule.value = new FshCode('Cal');
        const systemRule = new ExportableAssignmentRule('referenceRange.low.system');
        systemRule.value = 'http://other-units.org';
        const valueRule = new ExportableAssignmentRule('referenceRange.low.value');
        valueRule.value = 6;
        const unitRule = new ExportableAssignmentRule('referenceRange.low.unit');
        unitRule.value = 'nutrition label Calories';
        instance.rules.push(codeRule, systemRule, valueRule, unitRule);
        const myPackage = new Package();
        myPackage.add(instance);

        const expectedRule = new ExportableAssignmentRule('referenceRange.low');
        expectedRule.value = new FshCode(
          'Cal',
          'http://other-units.org',
          'nutrition label Calories'
        );
        optimizer.optimize(myPackage);
        expect(instance.rules.length).toBe(2);
        expect(instance.rules).toContainEqual(expectedRule);
        expect(instance.rules).toContainEqual(valueRule);
      });

      it('should not combine rules that have different base paths', () => {
        const instance = new ExportableInstance('MyProfile');
        instance.instanceOf = 'Observation';
        const codeRule = new ExportableAssignmentRule('category.coding[0].code');
        codeRule.value = new FshCode('gooseberry');
        const displayRule = new ExportableAssignmentRule('method.coding[0].display');
        displayRule.value = 'the goose is loose';
        instance.rules.push(codeRule, displayRule);
        const myPackage = new Package();
        myPackage.add(instance);

        optimizer.optimize(myPackage);
        expect(instance.rules.length).toBe(2);
        expect(instance.rules[0]).toEqual(codeRule);
        expect(instance.rules[1]).toEqual(displayRule);
      });
    });
  });
});
