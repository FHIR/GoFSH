import { cloneDeep } from 'lodash';
import { fshtypes } from 'fsh-sushi';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableInstance,
  ExportableProfile
} from '../../../src/exportable';
import CombineCodingAndQuantityValuesOptimizer from '../../../src/optimizer/plugins/CombineCodingAndQuantityValuesOptimizer';
import optimizer from '../../../src/optimizer/plugins/ResolveValueRuleURLsOptimizer';

describe('optimizer', () => {
  describe('#resolve_value_rule_urls', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('resolve_value_rule_urls');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toEqual([CombineCodingAndQuantityValuesOptimizer.name]);
    });

    it('should alias a system in an AssignmentRule when alias is true', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Observation';
      const codeRule = new ExportableAssignmentRule('code');
      codeRule.value = new fshtypes.FshCode('10-9', 'http://loinc.org');
      instance.rules = [codeRule];
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, undefined, { alias: true });

      const expectedRule = cloneDeep(codeRule);
      (expectedRule.value as fshtypes.FshCode).system = '$loinc';
      expect(instance.rules[0]).toEqual(expectedRule);
    });

    it('should alias a system in an AssignmentRule when alias is undefined', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Observation';
      const codeRule = new ExportableAssignmentRule('code');
      codeRule.value = new fshtypes.FshCode('10-9', 'http://loinc.org');
      instance.rules = [codeRule];
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage);

      const expectedRule = cloneDeep(codeRule);
      (expectedRule.value as fshtypes.FshCode).system = '$loinc';
      expect(instance.rules[0]).toEqual(expectedRule);
    });

    it('should not alias a system in an AssignmentRule when alias is false', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Observation';
      const codeRule = new ExportableAssignmentRule('code');
      codeRule.value = new fshtypes.FshCode('10-9', 'http://loinc.org');
      instance.rules = [codeRule];
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, undefined, { alias: false });

      expect(instance.rules[0]).toEqual(codeRule);
    });

    it('should alias a system in an CaretValueRule when alias is true', () => {
      const profile = new ExportableProfile('Foo');
      profile.parent = 'Observation';
      const jurisdictionRule = new ExportableCaretValueRule('');
      jurisdictionRule.caretPath = 'jurisdiction';
      jurisdictionRule.value = new fshtypes.FshCode('MA', 'http://jurisdiction.org/bar');
      profile.rules = [jurisdictionRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, undefined, { alias: true });

      const expectedRule = cloneDeep(jurisdictionRule);
      (expectedRule.value as fshtypes.FshCode).system = '$bar';
      expect(profile.rules[0]).toEqual(expectedRule);
    });

    it('should alias a system in an CaretValueRule when alias is undefined', () => {
      const profile = new ExportableProfile('Foo');
      profile.parent = 'Observation';
      const jurisdictionRule = new ExportableCaretValueRule('');
      jurisdictionRule.caretPath = 'jurisdiction';
      jurisdictionRule.value = new fshtypes.FshCode('MA', 'http://jurisdiction.org/bar');
      profile.rules = [jurisdictionRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage);

      const expectedRule = cloneDeep(jurisdictionRule);
      (expectedRule.value as fshtypes.FshCode).system = '$bar';
      expect(profile.rules[0]).toEqual(expectedRule);
    });

    it('should not alias a system in an CaretValueRule when alias is false', () => {
      const profile = new ExportableProfile('Foo');
      profile.parent = 'Observation';
      const jurisdictionRule = new ExportableCaretValueRule('');
      jurisdictionRule.caretPath = 'jurisdiction';
      jurisdictionRule.value = new fshtypes.FshCode('MA', 'http://jurisdiction.org/bar');
      profile.rules = [jurisdictionRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, undefined, { alias: false });

      expect(profile.rules[0]).toEqual(jurisdictionRule);
    });

    it('should maintain the original value when it cannot be aliased', () => {
      const profile = new ExportableProfile('Foo');
      profile.parent = 'Observation';
      const jurisdictionRule = new ExportableCaretValueRule('');
      jurisdictionRule.caretPath = 'jurisdiction';
      jurisdictionRule.value = new fshtypes.FshCode('MA', 'urn:oid:123');
      profile.rules = [jurisdictionRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage);

      expect(profile.rules[0]).toEqual(jurisdictionRule);
    });
  });
});
