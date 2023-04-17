import path from 'path';
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
import { MasterFisher } from '../../../src/utils';
import { loadTestDefinitions, stockLake } from '../../helpers';

describe('optimizer', () => {
  describe('#resolve_value_rule_system_urls_for_codes', () => {
    let fisher: MasterFisher;
    beforeAll(() => {
      const defs = loadTestDefinitions();
      const lake = stockLake(path.join(__dirname, 'fixtures', 'simple-codesystem.json'));
      fisher = new MasterFisher(lake, defs);
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('resolve_value_rule_system_urls_for_codes');
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
      optimizer.optimize(myPackage, fisher, { alias: true });

      const expectedRule = cloneDeep(codeRule);
      (expectedRule.value as fshtypes.FshCode).system = '$loinc';
      expect(instance.rules[0]).toEqual(expectedRule);
    });

    it('should alias a defined non-local system in an AssignmentRule when alias is true', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Observation';
      const statusRule = new ExportableAssignmentRule('status');
      statusRule.value = new fshtypes.FshCode('final', 'http://hl7.org/fhir/observation-status');
      instance.rules = [statusRule];
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher, { alias: true });

      const expectedRule = cloneDeep(statusRule);
      (expectedRule.value as fshtypes.FshCode).system = '$observation-status';
      expect(instance.rules[0]).toEqual(expectedRule);
    });

    it('should use the name of a locally defined system in an AssignmentRule when alias is true', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Observation';
      const codeRule = new ExportableAssignmentRule('code');
      codeRule.value = new fshtypes.FshCode(
        '10-9',
        'http://example.org/tests/CodeSystem/simple.codesystem'
      );
      instance.rules = [codeRule];
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher, { alias: true });

      const expectedRule = cloneDeep(codeRule);
      (expectedRule.value as fshtypes.FshCode).system = 'SimpleCodeSystem';
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
      optimizer.optimize(myPackage, fisher);

      const expectedRule = cloneDeep(codeRule);
      (expectedRule.value as fshtypes.FshCode).system = '$loinc';
      expect(instance.rules[0]).toEqual(expectedRule);
    });

    it('should alias a defined non-local system in an AssignmentRule when alias is undefined', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Observation';
      const statusRule = new ExportableAssignmentRule('status');
      statusRule.value = new fshtypes.FshCode('final', 'http://hl7.org/fhir/observation-status');
      instance.rules = [statusRule];
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = cloneDeep(statusRule);
      (expectedRule.value as fshtypes.FshCode).system = '$observation-status';
      expect(instance.rules[0]).toEqual(expectedRule);
    });

    it('should use the name of a locally defined system in an AssignmentRule when alias is undefined', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Observation';
      const codeRule = new ExportableAssignmentRule('code');
      codeRule.value = new fshtypes.FshCode(
        '10-9',
        'http://example.org/tests/CodeSystem/simple.codesystem'
      );
      instance.rules = [codeRule];
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = cloneDeep(codeRule);
      (expectedRule.value as fshtypes.FshCode).system = 'SimpleCodeSystem';
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
      optimizer.optimize(myPackage, fisher, { alias: false });

      expect(instance.rules[0]).toEqual(codeRule);
    });

    it('should not alias a defined non-local system in an AssignmentRule when alias is false', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Observation';
      const statusRule = new ExportableAssignmentRule('status');
      statusRule.value = new fshtypes.FshCode('final', 'http://hl7.org/fhir/observation-status');
      instance.rules = [statusRule];
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher, { alias: false });

      expect(instance.rules[0]).toEqual(statusRule);
    });

    it('should use the name of a locally defined system in an AssignmentRule when alias is false', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Observation';
      const codeRule = new ExportableAssignmentRule('code');
      codeRule.value = new fshtypes.FshCode(
        '10-9',
        'http://example.org/tests/CodeSystem/simple.codesystem'
      );
      instance.rules = [codeRule];
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher, { alias: false });

      const expectedRule = cloneDeep(codeRule);
      (expectedRule.value as fshtypes.FshCode).system = 'SimpleCodeSystem';
      expect(instance.rules[0]).toEqual(expectedRule);
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
      optimizer.optimize(myPackage, fisher, { alias: true });

      const expectedRule = cloneDeep(jurisdictionRule);
      (expectedRule.value as fshtypes.FshCode).system = '$bar';
      expect(profile.rules[0]).toEqual(expectedRule);
    });

    it('should use the name of a locally defined system in a CaretValueRule when alias is true', () => {
      const profile = new ExportableProfile('Foo');
      profile.parent = 'Observation';
      const jurisdictionRule = new ExportableCaretValueRule('');
      jurisdictionRule.caretPath = 'jurisdiction';
      jurisdictionRule.value = new fshtypes.FshCode(
        'MA',
        'http://example.org/tests/CodeSystem/simple.codesystem'
      );
      profile.rules = [jurisdictionRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher, { alias: true });

      const expectedRule = cloneDeep(jurisdictionRule);
      (expectedRule.value as fshtypes.FshCode).system = 'SimpleCodeSystem';
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
      optimizer.optimize(myPackage, fisher);

      const expectedRule = cloneDeep(jurisdictionRule);
      (expectedRule.value as fshtypes.FshCode).system = '$bar';
      expect(profile.rules[0]).toEqual(expectedRule);
    });

    it('should use the name of a locally defined system in a CaretValueRule when alias is undefined', () => {
      const profile = new ExportableProfile('Foo');
      profile.parent = 'Observation';
      const jurisdictionRule = new ExportableCaretValueRule('');
      jurisdictionRule.caretPath = 'jurisdiction';
      jurisdictionRule.value = new fshtypes.FshCode(
        'MA',
        'http://example.org/tests/CodeSystem/simple.codesystem'
      );
      profile.rules = [jurisdictionRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = cloneDeep(jurisdictionRule);
      (expectedRule.value as fshtypes.FshCode).system = 'SimpleCodeSystem';
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
      optimizer.optimize(myPackage, fisher, { alias: false });

      expect(profile.rules[0]).toEqual(jurisdictionRule);
    });

    it('should use the name of a locally defined system in a CaretValueRule when alias is false', () => {
      const profile = new ExportableProfile('Foo');
      profile.parent = 'Observation';
      const jurisdictionRule = new ExportableCaretValueRule('');
      jurisdictionRule.caretPath = 'jurisdiction';
      jurisdictionRule.value = new fshtypes.FshCode(
        'MA',
        'http://example.org/tests/CodeSystem/simple.codesystem'
      );
      profile.rules = [jurisdictionRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher, { alias: false });

      const expectedRule = cloneDeep(jurisdictionRule);
      (expectedRule.value as fshtypes.FshCode).system = 'SimpleCodeSystem';
      expect(profile.rules[0]).toEqual(expectedRule);
    });

    it('should maintain the original value when it is not locally defined and cannot be aliased', () => {
      const profile = new ExportableProfile('Foo');
      profile.parent = 'Observation';
      const jurisdictionRule = new ExportableCaretValueRule('');
      jurisdictionRule.caretPath = 'jurisdiction';
      jurisdictionRule.value = new fshtypes.FshCode('MA', 'urn:oid:123');
      profile.rules = [jurisdictionRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher);

      expect(profile.rules[0]).toEqual(jurisdictionRule);
    });
  });
});
