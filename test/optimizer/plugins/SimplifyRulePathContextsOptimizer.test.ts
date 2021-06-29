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
  ExportableAssignmentRule,
  ExportableAddElementRule,
  ExportableLogical
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

      // Profile: MyPatient
      // Parent: Patient
      // * name 1..*
      //   * given 1..*
      const expectedNameRule = cloneDeep(nameRule);
      expectedNameRule.indent = 0;
      const expectedGivenRule = cloneDeep(givenRule);
      expectedGivenRule.indent = 1;
      expectedGivenRule.path = 'given';

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([expectedNameRule, expectedGivenRule]);
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

      // Profile: MyPatient
      // Parent: Patient
      // * name MS
      //   * period 1..1
      //     * start MS
      //     * end N
      const expectedNameRule = cloneDeep(nameRule);
      expectedNameRule.indent = 0;
      const expectedPeriodRule = cloneDeep(periodRule);
      expectedPeriodRule.indent = 1;
      expectedPeriodRule.path = 'period';
      const expectedStartRule = cloneDeep(startRule);
      expectedStartRule.indent = 2;
      expectedStartRule.path = 'start';
      const expectedEndRule = cloneDeep(endRule);
      expectedEndRule.indent = 2;
      expectedEndRule.path = 'end';

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([
        expectedNameRule,
        expectedPeriodRule,
        expectedStartRule,
        expectedEndRule
      ]);
    });

    it('should simplify rule paths when adding elements', () => {
      // Logical: GroceryList
      // * produce 0..* BackboneElement "fruits and vegetables"
      // * produce.fruit 0..* BackboneElement "fruits"
      // * produce.fruit obeys gl-1
      // * produce.fruit.citrus 0..3 CodeableConcept "citrus fruit for vitamin c"
      // * produce.vegetable 0..* CodeableConcept "vegetables"
      // * bread[x] 0..* CodeableConcept or string "freshly baked, always"
      const logical = new ExportableLogical('GroceryList');
      const produceElement = new ExportableAddElementRule('produce');
      produceElement.min = 0;
      produceElement.max = '*';
      produceElement.types = [{ type: 'BackboneElement' }];
      produceElement.short = 'fruits and vegetables';
      const fruitElement = new ExportableAddElementRule('produce.fruit');
      fruitElement.min = 0;
      fruitElement.max = '*';
      fruitElement.types = [{ type: 'BackboneElement' }];
      fruitElement.short = 'fruit';
      const fruitObeys = new ExportableObeysRule('produce.fruit');
      fruitObeys.keys = ['gl-1'];
      const citrusElement = new ExportableAddElementRule('produce.fruit.citrus');
      citrusElement.min = 0;
      citrusElement.max = '3';
      citrusElement.types = [{ type: 'CodeableConcept' }];
      citrusElement.short = 'citrus fruit for vitamin c';
      const vegetableElement = new ExportableAddElementRule('produce.vegetable');
      vegetableElement.min = 0;
      vegetableElement.max = '*';
      vegetableElement.types = [{ type: 'BackboneElement' }];
      vegetableElement.short = 'vegetables';
      const breadElement = new ExportableAddElementRule('bread[x]');
      breadElement.min = 0;
      breadElement.max = '*';
      breadElement.types = [{ type: 'CodeableConcept' }, { type: 'string' }];
      breadElement.short = 'freshly baked, always';
      logical.rules.push(
        produceElement,
        fruitElement,
        fruitObeys,
        citrusElement,
        vegetableElement,
        breadElement
      );

      // Logical: GroceryList
      // * produce 0..* BackboneElement "fruits and vegetables"
      //   * fruit 0..* BackboneElement "fruits"
      //     * obeys gl-1
      //     * citrus 0..3 CodeableConcept "citrus fruit for vitamin c"
      //   * vegetable 0..* CodeableConcept "vegetables"
      // * bread[x] 0..* CodeableConcept or string "freshly baked, always"
      const expectedProduceElement = cloneDeep(produceElement);
      expectedProduceElement.indent = 0;
      const expectedFruitElement = cloneDeep(fruitElement);
      expectedFruitElement.path = 'fruit';
      expectedFruitElement.indent = 1;
      const expectedFruitObeys = cloneDeep(fruitObeys);
      expectedFruitObeys.path = '';
      expectedFruitObeys.indent = 2;
      const expectedCitrusElement = cloneDeep(citrusElement);
      expectedCitrusElement.path = 'citrus';
      expectedCitrusElement.indent = 2;
      const expectedVegetableElement = cloneDeep(vegetableElement);
      expectedVegetableElement.path = 'vegetable';
      expectedVegetableElement.indent = 1;
      const expectedBreadElement = cloneDeep(breadElement);
      expectedBreadElement.indent = 0;

      myPackage.add(logical);
      optimizer.optimize(myPackage);
      expect(logical.rules).toEqual([
        expectedProduceElement,
        expectedFruitElement,
        expectedFruitObeys,
        expectedCitrusElement,
        expectedVegetableElement,
        expectedBreadElement
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

      // Profile: MyPatient
      // Parent: Patient
      // * contact 1..10
      //   * obeys myp-1
      //   * relationship MS
      //     * from EnhancedRelationshipVS (extensible)
      const expectedContactCard = cloneDeep(contactCard);
      expectedContactCard.indent = 0;
      const expectedContactObeys = cloneDeep(contactObeys);
      expectedContactObeys.path = '';
      expectedContactObeys.indent = 1;
      const expectedRelationshipFlag = cloneDeep(relationshipFlag);
      expectedRelationshipFlag.path = 'relationship';
      expectedRelationshipFlag.indent = 1;
      const expectedRelationshipBinding = cloneDeep(relationshipBinding);
      expectedRelationshipBinding.path = '';
      expectedRelationshipBinding.indent = 2;

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([
        expectedContactCard,
        expectedContactObeys,
        expectedRelationshipFlag,
        expectedRelationshipBinding
      ]);
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

      // Profile: MyPatient
      // Parent: Patient
      // * name MS
      //   * period.end TU
      const expectedNameRule = cloneDeep(nameRule);
      expectedNameRule.indent = 0;
      const expectedEndRule = cloneDeep(endRule);
      expectedEndRule.path = 'period.end';
      expectedEndRule.indent = 1;

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([expectedNameRule, expectedEndRule]);
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

      // Instance: OceanPatient
      // InstanceOf: Patient
      // Usage: #example
      // * address[+].city = "Shark Park"
      //   * id = "shark-park"
      // * address[+].city = "Clam Valley"
      //   * id = "clam-valley"
      const expectedSharkCity = cloneDeep(sharkCity);
      expectedSharkCity.indent = 0;
      const expectedSharkId = cloneDeep(sharkId);
      expectedSharkId.path = 'id';
      expectedSharkId.indent = 1;
      const expectedClamCity = cloneDeep(clamCity);
      expectedClamCity.indent = 0;
      const expectedClamId = cloneDeep(clamId);
      expectedClamId.path = 'id';
      expectedClamId.indent = 1;

      myPackage.add(instance);
      optimizer.optimize(myPackage);
      expect(instance.rules).toEqual([
        expectedSharkCity,
        expectedSharkId,
        expectedClamCity,
        expectedClamId
      ]);
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

      // Instance: OceanPatient
      // InstanceOf: Patient
      // Usage: #example
      // * address[+].city = "Shark Park"
      // * address[+].city = "Clam Valley"
      const expectedShark = cloneDeep(sharkCity);
      expectedShark.indent = 0;
      const expectedClam = cloneDeep(clamCity);
      expectedClam.indent = 0;

      myPackage.add(instance);
      optimizer.optimize(myPackage);
      expect(instance.rules).toEqual([expectedShark, expectedClam]);
    });
  });
});
