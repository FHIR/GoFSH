import optimizer from '../../../src/optimizer/plugins/SimplifyRulePathContextsOptimizer';
import SimplifyArrayIndexingOptimizer from '../../../src/optimizer/plugins/SimplifyArrayIndexingOptimizer';
import SimplifyMappingNamesOptimizer from '../../../src/optimizer/plugins/SimplifyMappingNamesOptimizer';
import {
  ExportableProfile,
  ExportableCardRule,
  ExportableFlagRule,
  ExportableObeysRule,
  ExportableBindingRule,
  ExportableInstance,
  ExportableAssignmentRule
} from '../../../src/exportable';
import { Package } from '../../../src/processor';
import { cloneDeep } from 'lodash';

describe('optimizer', () => {
  describe('simplify_rule_path_contexts', () => {
    let myPackage: Package;

    beforeEach(() => {
      myPackage = new Package();
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('simplify_rule_path_contexts');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toEqual([
        SimplifyArrayIndexingOptimizer.name,
        SimplifyMappingNamesOptimizer.name
      ]);
    });

    it('should simplify rule paths with one indent level', () => {
      // Profile: MyPatient
      // Parent: Patient
      // * name 1..*
      // * name.given 1..*
      const profile = new ExportableProfile('MyPatient');
      profile.parent = 'Patient';
      const nameRule = new ExportableCardRule('name');
      nameRule.min = 1;
      nameRule.max = '*';
      const givenRule = new ExportableCardRule('name.given');
      givenRule.min = 1;
      givenRule.max = '*';
      profile.rules.push(nameRule, givenRule);
      myPackage.add(profile);
      optimizer.optimize(myPackage);

      const expectedGivenRule = cloneDeep(givenRule);
      expectedGivenRule.indent = 1;
      expectedGivenRule.path = 'given';
      expect(profile.rules).toEqual([nameRule, expectedGivenRule]);
    });

    it('should simplify rule paths with multiple indent levels', () => {
      // Profile: MyPatient
      // Parent: Patient
      // * name MS
      // * name.period 1..1
      // * name.period.start MS
      // * name.period.end N
      const profile = new ExportableProfile('MyPatient');
      profile.parent = 'Patient';
      const nameRule = new ExportableFlagRule('name');
      nameRule.mustSupport = true;
      const periodRule = new ExportableCardRule('name.period');
      periodRule.min = 1;
      periodRule.max = '1';
      const startRule = new ExportableFlagRule('name.period.start');
      startRule.mustSupport = true;
      const endRule = new ExportableFlagRule('name.period.end');
      endRule.normative = true;
      profile.rules.push(nameRule, periodRule, startRule, endRule);
      myPackage.add(profile);
      optimizer.optimize(myPackage);

      const expectedPeriodRule = cloneDeep(periodRule);
      expectedPeriodRule.indent = 1;
      expectedPeriodRule.path = 'period';
      const expectedStartRule = cloneDeep(startRule);
      expectedStartRule.indent = 2;
      expectedStartRule.path = 'start';
      const expectedEndRule = cloneDeep(endRule);
      expectedEndRule.indent = 2;
      expectedEndRule.path = 'end';
      expect(profile.rules).toEqual([
        nameRule,
        expectedPeriodRule,
        expectedStartRule,
        expectedEndRule
      ]);
    });

    it('should simplify rule paths that exactly match a context path', () => {
      // Profile: MyPatient
      // Parent: Patient
      // * contact 1..10
      // * contact obeys myp-1
      // * contact.relationship MS
      // * contact.relationship from EnhancedRelationshipVS (extensible)
      const profile = new ExportableProfile('MyPatient');
      profile.parent = 'Patient';
      const contactCard = new ExportableCardRule('contact');
      contactCard.min = 1;
      contactCard.max = '10';
      const contactObeys = new ExportableObeysRule('contact');
      contactObeys.keys = ['myp-1'];
      const relationshipFlag = new ExportableFlagRule('contact.relationship');
      relationshipFlag.mustSupport = true;
      const relationshipBinding = new ExportableBindingRule('contact.relationship');
      relationshipBinding.valueSet = 'EnhancedRelationshipVS';
      relationshipBinding.strength = 'extensible';
      profile.rules.push(contactCard, contactObeys, relationshipFlag, relationshipBinding);
      myPackage.add(profile);
      optimizer.optimize(myPackage);

      const expectedObeys = cloneDeep(contactObeys);
      expectedObeys.path = '';
      expectedObeys.indent = 1;
      const expectedFlag = cloneDeep(relationshipFlag);
      expectedFlag.path = 'relationship';
      expectedFlag.indent = 1;
      const expectedBinding = cloneDeep(relationshipBinding);
      expectedBinding.path = '';
      expectedBinding.indent = 2;
      expect(profile.rules).toEqual([contactCard, expectedObeys, expectedFlag, expectedBinding]);
    });

    it('should simplify rule paths that add more than one part after the context path', () => {
      // Profile: MyPatient
      // Parent: Patient
      // * name MS
      // * name.period.end TU
      const profile = new ExportableProfile('MyPatient');
      profile.parent = 'Patient';
      const nameRule = new ExportableFlagRule('name');
      nameRule.mustSupport = true;
      const endRule = new ExportableFlagRule('name.period.end');
      endRule.trialUse = true;
      profile.rules.push(nameRule, endRule);
      myPackage.add(profile);
      optimizer.optimize(myPackage);

      const expectedEndRule = cloneDeep(endRule);
      expectedEndRule.path = 'period.end';
      expectedEndRule.indent = 1;
      expect(profile.rules).toEqual([nameRule, expectedEndRule]);
    });

    it('should simplify rule paths that use soft indexing', () => {
      // Instance: OceanPatient
      // InstanceOf: Patient
      // Usage: #example
      // * address[+].city = "Shark Park"
      // * address[=].city.id = "shark-park"
      // * address[+].city = "Clam Valley"
      // * address[=].city.id = "clam-valley"
      const instance = new ExportableInstance('OceanPatient');
      instance.instanceOf = 'Patient';
      instance.usage = 'Example';
      const sharkCity = new ExportableAssignmentRule('address[+].city');
      sharkCity.value = 'Shark Park';
      const sharkId = new ExportableAssignmentRule('address[=].city.id');
      sharkId.value = 'shark-park';
      const clamCity = new ExportableAssignmentRule('address[+].city');
      clamCity.value = 'Clam Valley';
      const clamId = new ExportableAssignmentRule('address[=].city.id');
      clamId.value = 'clam-valley';
      instance.rules.push(sharkCity, sharkId, clamCity, clamId);
      myPackage.add(instance);
      optimizer.optimize(myPackage);

      const expectedSharkId = cloneDeep(sharkId);
      expectedSharkId.path = 'id';
      expectedSharkId.indent = 1;
      const expectedClamId = cloneDeep(clamId);
      expectedClamId.path = 'id';
      expectedClamId.indent = 1;
      expect(instance.rules).toEqual([sharkCity, expectedSharkId, clamCity, expectedClamId]);
    });

    it('should not change rule paths with different indices', () => {
      // Instance: OceanPatient
      // InstanceOf: Patient
      // Usage: #example
      // * address[+].city = "Shark Park"
      // * address[+].city = "Clam Valley"
      const instance = new ExportableInstance('OceanPatient');
      instance.instanceOf = 'Patient';
      instance.usage = 'Example';
      const sharkCity = new ExportableAssignmentRule('address[+].city');
      sharkCity.value = 'Shark Park';
      const clamCity = new ExportableAssignmentRule('address[+].city');
      clamCity.value = 'Clam Valley';
      instance.rules.push(sharkCity, clamCity);
      myPackage.add(instance);
      optimizer.optimize(myPackage);

      expect(instance.rules).toEqual([sharkCity, clamCity]);
    });
  });
});
