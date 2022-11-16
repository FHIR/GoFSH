import optimizer from '../../../src/optimizer/plugins/SimplifyRulePathContextsOptimizer';
import SimplifyArrayIndexingOptimizer from '../../../src/optimizer/plugins/SimplifyArrayIndexingOptimizer';
import SimplifyObeysRuleDotPathsOptimizer from '../../../src/optimizer/plugins/SimplifyObeysRuleDotPathsOptimizer';
import {
  ExportableProfile,
  ExportableCardRule,
  ExportableFlagRule,
  ExportableObeysRule,
  ExportableBindingRule,
  ExportableInstance,
  ExportableAssignmentRule,
  ExportableAddElementRule,
  ExportableLogical,
  ExportableCaretValueRule,
  ExportableExtension,
  ExportableContainsRule,
  ExportableOnlyRule,
  ExportableCombinedCardFlagRule,
  ExportableCodeSystem,
  ExportableConceptRule,
  ExportablePathRule
} from '../../../src/exportable';
import { Package } from '../../../src/processor';
import { cloneDeep } from 'lodash';
import { fshtypes } from 'fsh-sushi';
const { FshCode } = fshtypes;

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
        SimplifyObeysRuleDotPathsOptimizer.name
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
      // * contact.relationship ^id = "relationship-id"
      const profile = new ExportableProfile('MyPatient');
      profile.parent = 'Patient';
      const contactCard = new ExportableCardRule('contact');
      contactCard.min = 1;
      contactCard.max = '10';
      const contactObeys = new ExportableObeysRule('contact');
      contactObeys.keys = ['myp-1'];
      const relationshipFlag = new ExportableFlagRule('contact.relationship');
      relationshipFlag.mustSupport = true;
      const relationshipCaret = new ExportableCaretValueRule('contact.relationship');
      relationshipCaret.caretPath = 'id';
      relationshipCaret.value = 'relationship-id';
      profile.rules.push(contactCard, contactObeys, relationshipFlag, relationshipCaret);

      // Profile: MyPatient
      // Parent: Patient
      // * contact 1..10
      //   * obeys myp-1
      //   * relationship MS
      //     * ^id = "relationship-id"
      const expectedContactCard = cloneDeep(contactCard);
      expectedContactCard.indent = 0;
      const expectedContactObeys = cloneDeep(contactObeys);
      expectedContactObeys.path = '';
      expectedContactObeys.indent = 1;
      const expectedRelationshipFlag = cloneDeep(relationshipFlag);
      expectedRelationshipFlag.path = 'relationship';
      expectedRelationshipFlag.indent = 1;
      const expectedRelationshipCaret = cloneDeep(relationshipCaret);
      expectedRelationshipCaret.path = '';
      expectedRelationshipCaret.indent = 2;

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([
        expectedContactCard,
        expectedContactObeys,
        expectedRelationshipFlag,
        expectedRelationshipCaret
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

    it('should simplify rule paths in concept rules', () => {
      // CodeSystem: AvatarCS
      // * #water-tribe "Water Tribe"
      // * #water-tribe #southern "Southern Water Tribe"
      // * #water-tribe #northern "Northern Water Tribe"
      // * #water-tribe #colonies "Water Tribe colonies"
      // * #water-tribe #colonies #swamp-tribe "Swamp Colony"

      const cs = new ExportableCodeSystem('AvatarCS');
      const concept1 = new ExportableConceptRule('water-tribe', 'Water Tribe');
      const concept2 = new ExportableConceptRule('southern', 'Southern Water Tribe');
      concept2.hierarchy = ['water-tribe'];
      const concept3 = new ExportableConceptRule('northern', 'Northern Water Tribe');
      concept3.hierarchy = ['water-tribe'];
      const concept4 = new ExportableConceptRule('colonies', 'Water Tribe Colonies');
      concept4.hierarchy = ['water-tribe'];
      const concept5 = new ExportableConceptRule('swamp-tribe', 'Swamp Colony');
      concept5.hierarchy = ['water-tribe', 'colonies'];
      cs.rules.push(concept1, concept2, concept3, concept4, concept5);

      // CodeSystem: AvatarCS
      // * #water-tribe "Water Tribe"
      //   * #southern "Southern Water Tribe"
      //   * #northern "Northern Water Tribe"
      //   * #colonies "Water Tribe colonies"
      //     * #swamp-tribe "Swamp Colony"
      const expectedConcept1 = cloneDeep(concept1);
      expectedConcept1.indent = 0;
      const expectedConcept2 = cloneDeep(concept2);
      expectedConcept2.indent = 1;
      expectedConcept2.hierarchy = [];
      const expectedConcept3 = cloneDeep(concept3);
      expectedConcept3.indent = 1;
      expectedConcept3.hierarchy = [];
      const expectedConcept4 = cloneDeep(concept4);
      expectedConcept4.indent = 1;
      expectedConcept4.hierarchy = [];
      const expectedConcept5 = cloneDeep(concept5);
      expectedConcept5.indent = 2;
      expectedConcept5.hierarchy = [];

      myPackage.add(cs);
      optimizer.optimize(myPackage);
      expect(cs.rules).toEqual([
        expectedConcept1,
        expectedConcept2,
        expectedConcept3,
        expectedConcept4,
        expectedConcept5
      ]);
    });

    it('should simplify rule paths in concept rules and CodeCaretValue rules', () => {
      // CodeSystem: AvatarCS
      // * #water-tribe "Water Tribe"
      // * #water-tribe ^designation.code = 'en'
      // * #water-tribe #southern "Southern Water Tribe"
      // * #water-tribe #southern ^designation.code = 'en'
      // * #water-tribe #northern "Northern Water Tribe"
      // * #water-tribe #colonies "Water Tribe colonies"
      // * #water-tribe #colonies #swamp-tribe "Swamp Colony"
      // * #water-tribe #colonies #swamp-tribe ^designation.code = 'en'

      const cs = new ExportableCodeSystem('AvatarCS');
      const concept1 = new ExportableConceptRule('water-tribe', 'Water Tribe');
      const designation1 = new ExportableCaretValueRule('');
      designation1.isCodeCaretRule = true;
      designation1.caretPath = 'designation.code';
      designation1.pathArray = ['water-tribe'];
      designation1.value = new FshCode('en');
      const concept2 = new ExportableConceptRule('southern', 'Southern Water Tribe');
      concept2.hierarchy = ['water-tribe'];
      const designation2 = new ExportableCaretValueRule('');
      designation2.isCodeCaretRule = true;
      designation2.caretPath = 'designation.code';
      designation2.pathArray = ['water-tribe', 'southern'];
      designation2.value = new FshCode('en');
      const concept3 = new ExportableConceptRule('northern', 'Northern Water Tribe');
      concept3.hierarchy = ['water-tribe'];
      const concept4 = new ExportableConceptRule('colonies', 'Water Tribe Colonies');
      concept4.hierarchy = ['water-tribe'];
      const concept5 = new ExportableConceptRule('swamp-tribe', 'Swamp Colony');
      concept5.hierarchy = ['water-tribe', 'colonies'];
      const designation3 = new ExportableCaretValueRule('');
      designation3.isCodeCaretRule = true;
      designation3.caretPath = 'designation.code';
      designation3.pathArray = ['water-tribe', 'colonies', 'swamp-tribe'];
      designation3.value = new FshCode('en');
      cs.rules.push(
        concept1,
        designation1,
        concept2,
        designation2,
        concept3,
        concept4,
        concept5,
        designation3
      );

      // CodeSystem: AvatarCS
      // * #water-tribe "Water Tribe"
      //   * ^designation.code = 'en'
      //   * #southern "Southern Water Tribe"
      //     * ^designation.code = 'en'
      //   * #northern "Northern Water Tribe"
      //   * #colonies "Water Tribe colonies"
      //     * #swamp-tribe "Swamp Colony"
      //     * ^designation.code = 'en'
      const expectedConcept1 = cloneDeep(concept1);
      expectedConcept1.indent = 0;
      const expectedDesignation1 = cloneDeep(designation1);
      expectedDesignation1.indent = 1;
      expectedDesignation1.pathArray = [];
      const expectedConcept2 = cloneDeep(concept2);
      expectedConcept2.indent = 1;
      expectedConcept2.hierarchy = [];
      const expectedDesignation2 = cloneDeep(designation2);
      expectedDesignation2.indent = 2;
      expectedDesignation2.pathArray = [];
      const expectedConcept3 = cloneDeep(concept3);
      expectedConcept3.indent = 1;
      expectedConcept3.hierarchy = [];
      const expectedConcept4 = cloneDeep(concept4);
      expectedConcept4.indent = 1;
      expectedConcept4.hierarchy = [];
      const expectedConcept5 = cloneDeep(concept5);
      expectedConcept5.indent = 2;
      expectedConcept5.hierarchy = [];
      const expectedDesignation3 = cloneDeep(designation3);
      expectedDesignation3.indent = 3;
      expectedDesignation3.pathArray = [];

      myPackage.add(cs);
      optimizer.optimize(myPackage);
      expect(cs.rules).toEqual([
        expectedConcept1,
        expectedDesignation1,
        expectedConcept2,
        expectedDesignation2,
        expectedConcept3,
        expectedConcept4,
        expectedConcept5,
        expectedDesignation3
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

    it('should not indent a no-path caret rule that follows another no-path caret rule', () => {
      // Profile: MyPatient
      // Parent: Patient
      // * ^version = "4.0.0"
      // * ^date = "2021-07-13"
      // * ^publisher = "Ocean Publisher"
      const profile = new ExportableProfile('MyPatient');
      profile.parent = 'Patient';
      const versionRule = new ExportableCaretValueRule('');
      versionRule.caretPath = 'version';
      versionRule.value = '4.0.0';
      const dateRule = new ExportableCaretValueRule('');
      dateRule.caretPath = 'date';
      dateRule.value = '2021-07-13';
      const publisherRule = new ExportableCaretValueRule('');
      publisherRule.caretPath = 'publisher';
      publisherRule.value = 'Ocean Publisher';
      profile.rules.push(versionRule, dateRule, publisherRule);

      // Profile: MyPatient
      // Parent: Patient
      // * ^version = "4.0.0"
      // * ^date = "2021-07-13"
      // * ^publisher = "Ocean Publisher"
      const expectedVersion = cloneDeep(versionRule);
      expectedVersion.indent = 0;
      const expectedDate = cloneDeep(dateRule);
      expectedDate.indent = 0;
      const expectedPublisher = cloneDeep(publisherRule);
      expectedPublisher.indent = 0;

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([expectedVersion, expectedDate, expectedPublisher]);
    });

    it('should not a indent a dot-path caret value that follows a no-path caret value rule', () => {
      // Extension: OceanExtension
      // * ^ version = "4.0.0"
      // * . 0..1
      const extension = new ExportableExtension('OceanExtension');
      const versionRule = new ExportableCaretValueRule('');
      versionRule.caretPath = 'version';
      versionRule.value = '4.0.0';
      const rootRule = new ExportableCardRule('.');
      rootRule.min = 0;
      rootRule.max = '1';
      extension.rules.push(versionRule, rootRule);

      // Extension: OceanExtension
      // * ^ version = "4.0.0"
      // * . 0..1
      const expectedVersion = cloneDeep(versionRule);
      expectedVersion.indent = 0;
      const expectedRoot = cloneDeep(rootRule);
      expectedRoot.indent = 0;

      myPackage.add(extension);
      optimizer.optimize(myPackage);
      expect(extension.rules).toEqual([expectedVersion, expectedRoot]);
    });

    it('should not indent to create a card rule with no path', () => {
      // Profile: MyObservation
      // Parent: Observation
      // * referenceRange 0..10
      // * referenceRange.appliesTo from SpecialVS (example)
      // * referenceRange.appliesTo 0..3
      // * component.interpretation from AnotherVS (extensible)
      // * component.interpretation 1..*
      const profile = new ExportableProfile('MyObservation');
      profile.parent = 'Observation';
      const refCard = new ExportableCardRule('referenceRange');
      refCard.min = 0;
      refCard.max = '10';
      const appliesBind = new ExportableBindingRule('referenceRange.appliesTo');
      appliesBind.valueSet = 'SpecialVS';
      appliesBind.strength = 'example';
      const appliesCard = new ExportableCardRule('referenceRange.appliesTo');
      appliesCard.min = 0;
      appliesCard.max = '3';
      const interpretationBind = new ExportableBindingRule('component.interpretation');
      interpretationBind.valueSet = 'AnotherVS';
      interpretationBind.strength = 'extensible';
      const interpretationCard = new ExportableCardRule('component.interpretation');
      interpretationCard.min = 1;
      interpretationCard.max = '*';
      profile.rules.push(refCard, appliesBind, appliesCard, interpretationBind, interpretationCard);

      // Profile: MyObservation
      // Parent: Observation
      // * referenceRange 0..10
      //   * appliesTo from SpecialVS (example)
      //   * appliesTo 0..3
      // * component.interpretation from AnotherVS (extensible)
      // * component.interpretation 1..*
      const expectedRefCard = cloneDeep(refCard);
      expectedRefCard.indent = 0;
      const expectedAppliesBind = cloneDeep(appliesBind);
      expectedAppliesBind.indent = 1;
      expectedAppliesBind.path = 'appliesTo';
      const expectedAppliesCard = cloneDeep(appliesCard);
      expectedAppliesCard.indent = 1;
      expectedAppliesCard.path = 'appliesTo';
      const expectedInterpretationBind = cloneDeep(interpretationBind);
      expectedInterpretationBind.indent = 0;
      const expectedInterpretationCard = cloneDeep(interpretationCard);
      expectedInterpretationCard.indent = 0;

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([
        expectedRefCard,
        expectedAppliesBind,
        expectedAppliesCard,
        expectedInterpretationBind,
        expectedInterpretationCard
      ]);
    });

    it('should not indent to create a flag rule with no path', () => {
      // Profile: MyObservation
      // Parent: Observation
      // * referenceRange 0..10
      // * referenceRange.appliesTo from SpecialVS (example)
      // * referenceRange.appliesTo MS
      // * component.interpretation from AnotherVS (extensible)
      // * component.interpretation MS
      const profile = new ExportableProfile('MyObservation');
      profile.parent = 'Observation';
      const refCard = new ExportableCardRule('referenceRange');
      refCard.min = 0;
      refCard.max = '10';
      const appliesBind = new ExportableBindingRule('referenceRange.appliesTo');
      appliesBind.valueSet = 'SpecialVS';
      appliesBind.strength = 'example';
      const appliesFlag = new ExportableFlagRule('referenceRange.appliesTo');
      appliesFlag.mustSupport = true;
      const interpretationBind = new ExportableBindingRule('component.interpretation');
      interpretationBind.valueSet = 'AnotherVS';
      interpretationBind.strength = 'extensible';
      const interpretationFlag = new ExportableFlagRule('component.interpretation');
      interpretationFlag.mustSupport = true;
      profile.rules.push(refCard, appliesBind, appliesFlag, interpretationBind, interpretationFlag);

      // Profile: MyObservation
      // Parent: Observation
      // * referenceRange 0..10
      //   * appliesTo from SpecialVS (example)
      //   * appliesTo MS
      // * component.interpretation from AnotherVS (extensible)
      // * component.interpretation MS
      const expectedRefCard = cloneDeep(refCard);
      expectedRefCard.indent = 0;
      const expectedAppliesBind = cloneDeep(appliesBind);
      expectedAppliesBind.indent = 1;
      expectedAppliesBind.path = 'appliesTo';
      const expectedAppliesFlag = cloneDeep(appliesFlag);
      expectedAppliesFlag.indent = 1;
      expectedAppliesFlag.path = 'appliesTo';
      const expectedInterpretationBind = cloneDeep(interpretationBind);
      expectedInterpretationBind.indent = 0;
      const expectedInterpretationFlag = cloneDeep(interpretationFlag);
      expectedInterpretationFlag.indent = 0;

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([
        expectedRefCard,
        expectedAppliesBind,
        expectedAppliesFlag,
        expectedInterpretationBind,
        expectedInterpretationFlag
      ]);
    });

    it('should not indent to create a combined card and flag rule with no path', () => {
      // Profile: MyObservation
      // Parent: Observation
      // * referenceRange 0..10
      // * referenceRange.appliesTo from SpecialVS (example)
      // * referenceRange.appliesTo 0..3 TU
      // * component.interpretation from AnotherVS (extensible)
      // * component.interpretation 1..* D
      const profile = new ExportableProfile('MyObservation');
      profile.parent = 'Observation';
      const refCard = new ExportableCardRule('referenceRange');
      refCard.min = 0;
      refCard.max = '10';
      const appliesBind = new ExportableBindingRule('referenceRange.appliesTo');
      appliesBind.valueSet = 'SpecialVS';
      appliesBind.strength = 'example';
      const appliesCard = new ExportableCardRule('referenceRange.appliesTo');
      appliesCard.min = 0;
      appliesCard.max = '3';
      const appliesFlag = new ExportableFlagRule('referenceRange.appliesTo');
      appliesFlag.trialUse = true;
      const appliesCombined = new ExportableCombinedCardFlagRule(
        'referenceRange.appliesTo',
        appliesCard,
        appliesFlag
      );
      const interpretationBind = new ExportableBindingRule('component.interpretation');
      interpretationBind.valueSet = 'AnotherVS';
      interpretationBind.strength = 'extensible';
      const interpretationCard = new ExportableCardRule('component.interpretation');
      interpretationCard.min = 1;
      interpretationCard.max = '*';
      const interpretationFlag = new ExportableFlagRule('component.interpretation');
      interpretationFlag.draft = true;
      const interpretationCombined = new ExportableCombinedCardFlagRule(
        'component.interpretation',
        interpretationCard,
        interpretationFlag
      );
      profile.rules.push(
        refCard,
        appliesBind,
        appliesCombined,
        interpretationBind,
        interpretationCombined
      );

      // Profile: MyObservation
      // Parent: Observation
      // * referenceRange 0..10
      //   * appliesTo from SpecialVS (example)
      //   * appliesTo 0..3 TU
      // * component.interpretation from AnotherVS (extensible)
      // * component.interpretation 1..* D
      const expectedRefCard = cloneDeep(refCard);
      expectedRefCard.indent = 0;
      const expectedAppliesBind = cloneDeep(appliesBind);
      expectedAppliesBind.indent = 1;
      expectedAppliesBind.path = 'appliesTo';
      const expectedAppliesCombined = cloneDeep(appliesCombined);
      expectedAppliesCombined.indent = 1;
      expectedAppliesCombined.path = 'appliesTo';
      const expectedInterpretationBind = cloneDeep(interpretationBind);
      expectedInterpretationBind.indent = 0;
      const expectedInterpretationCombined = cloneDeep(interpretationCombined);
      expectedInterpretationCombined.indent = 0;

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([
        expectedRefCard,
        expectedAppliesBind,
        expectedAppliesCombined,
        expectedInterpretationBind,
        expectedInterpretationCombined
      ]);
    });

    it('should not indent to create a binding rule with no path', () => {
      // Profile: MyObservation
      // Parent: Observation
      // * referenceRange 0..10
      // * referenceRange.appliesTo MS
      // * referenceRange.appliesTo from SpecialVS (example)
      // * component.interpretation MS
      // * component.interpretation from AnotherVS (extensible)
      const profile = new ExportableProfile('MyObservation');
      profile.parent = 'Observation';
      const refCard = new ExportableCardRule('referenceRange');
      refCard.min = 0;
      refCard.max = '10';
      const appliesFlag = new ExportableFlagRule('referenceRange.appliesTo');
      appliesFlag.mustSupport = true;
      const appliesBind = new ExportableBindingRule('referenceRange.appliesTo');
      appliesBind.valueSet = 'SpecialVS';
      appliesBind.strength = 'example';
      const interpretationFlag = new ExportableFlagRule('component.interpretation');
      interpretationFlag.mustSupport = true;
      const interpretationBind = new ExportableBindingRule('component.interpretation');
      interpretationBind.valueSet = 'AnotherVS';
      interpretationBind.strength = 'extensible';
      profile.rules.push(refCard, appliesFlag, appliesBind, interpretationFlag, interpretationBind);

      // Profile: MyObservation
      // Parent: Observation
      // * referenceRange 0..10
      //   * appliesTo MS
      //   * appliesTo from SpecialVS (example)
      // * component.interpretation MS
      // * component.interpretation from AnotherVS (extensible)
      const expectedRefCard = cloneDeep(refCard);
      expectedRefCard.indent = 0;
      const expectedAppliesBind = cloneDeep(appliesBind);
      expectedAppliesBind.indent = 1;
      expectedAppliesBind.path = 'appliesTo';
      const expectedAppliesFlag = cloneDeep(appliesFlag);
      expectedAppliesFlag.indent = 1;
      expectedAppliesFlag.path = 'appliesTo';
      const expectedInterpretationBind = cloneDeep(interpretationBind);
      expectedInterpretationBind.indent = 0;
      const expectedInterpretationFlag = cloneDeep(interpretationFlag);
      expectedInterpretationFlag.indent = 0;

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([
        expectedRefCard,
        expectedAppliesFlag,
        expectedAppliesBind,
        expectedInterpretationFlag,
        expectedInterpretationBind
      ]);
    });

    it('should not indent to create an assignment rule with no path', () => {
      // Profile: MyObservation
      // Parent: Observation
      // * referenceRange 0..10
      // * referenceRange.text MS
      // * referenceRange.text = "This is the important range."
      // * component.interpretation MS
      // * component.interpretation = #B
      const profile = new ExportableProfile('MyObservation');
      profile.parent = 'Observation';
      const refCard = new ExportableCardRule('referenceRange');
      refCard.min = 0;
      refCard.max = '10';
      const textFlag = new ExportableFlagRule('referenceRange.text');
      textFlag.mustSupport = true;
      const textAssign = new ExportableAssignmentRule('referenceRange.text');
      textAssign.value = 'This is the important range.';
      const interpretationFlag = new ExportableFlagRule('component.interpretation');
      interpretationFlag.mustSupport = true;
      const interpretationAssign = new ExportableAssignmentRule('component.interpretation');
      interpretationAssign.value = new FshCode('B');
      profile.rules.push(refCard, textFlag, textAssign, interpretationFlag, interpretationAssign);

      // Profile: MyObservation
      // Parent: Observation
      // * referenceRange 0..10
      //   * text MS
      //   * text = "This is the important range."
      // * component.interpretation MS
      // * component.interpretation = #B
      const expectedRefCard = cloneDeep(refCard);
      expectedRefCard.indent = 0;
      const expectedTextFlag = cloneDeep(textFlag);
      expectedTextFlag.indent = 1;
      expectedTextFlag.path = 'text';
      const expectedTextAssign = cloneDeep(textAssign);
      expectedTextAssign.indent = 1;
      expectedTextAssign.path = 'text';
      const expectedInterpretationFlag = cloneDeep(interpretationFlag);
      expectedInterpretationFlag.indent = 0;
      const expectedInterpretationAssign = cloneDeep(interpretationAssign);
      expectedInterpretationAssign.indent = 0;

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([
        expectedRefCard,
        expectedTextFlag,
        expectedTextAssign,
        expectedInterpretationFlag,
        expectedInterpretationAssign
      ]);
    });

    it('should not indent to create a contains rule with no path', () => {
      // Profile: MyObservation
      // Parent: Observation
      // * component ^slicing.discriminator.type = #value
      // * component ^slicing.discriminator.path = "interpretation"
      // * component ^slicing.rules = #open
      // * component contains MySlice 0..1
      const profile = new ExportableProfile('MyObservation');
      profile.parent = 'Observation';
      const slicingType = new ExportableCaretValueRule('component');
      slicingType.caretPath = 'slicing.discriminator.type';
      slicingType.value = new FshCode('value');
      const slicingPath = new ExportableCaretValueRule('component');
      slicingPath.caretPath = 'slicing.discriminator.path';
      slicingPath.value = 'interpretation';
      const slicingRules = new ExportableCaretValueRule('component');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');
      const componentContains = new ExportableContainsRule('component');
      componentContains.items = [{ name: 'MySlice' }];
      const sliceCard = new ExportableCardRule('component[MySlice]');
      sliceCard.min = 0;
      sliceCard.max = '1';
      componentContains.cardRules.push(sliceCard);
      profile.rules.push(slicingType, slicingPath, slicingRules, componentContains);

      // Profile: MyObservation
      // Parent: Observation
      // * component ^slicing.discriminator.type = #value
      //   * ^slicing.discriminator.path = "interpretation"
      //   * ^slicing.rules = #open
      // * component contains MySlice 0..1
      const expectedSlicingType = cloneDeep(slicingType);
      expectedSlicingType.indent = 0;
      const expectedSlicingPath = cloneDeep(slicingPath);
      expectedSlicingPath.indent = 1;
      expectedSlicingPath.path = '';

      const expectedSlicingRules = cloneDeep(slicingRules);
      expectedSlicingRules.indent = 1;
      expectedSlicingRules.path = '';
      const expectedComponentContains = cloneDeep(componentContains);
      expectedComponentContains.indent = 0;

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([
        expectedSlicingType,
        expectedSlicingPath,
        expectedSlicingRules,
        expectedComponentContains
      ]);
    });

    it('should not indent to create an only rule with no path', () => {
      // Profile: MyObservation
      // Parent: Observation
      // * value[x] 1..1
      // * value[x] only integer
      // * component 1..*
      // * component.value[x] MS
      // * component.value[x] only Quantity or Ratio
      const profile = new ExportableProfile('MyProfile');
      profile.parent = 'Observation';
      const valueCard = new ExportableCardRule('value[x]');
      valueCard.min = 1;
      valueCard.max = '1';
      const valueOnly = new ExportableOnlyRule('value[x]');
      valueOnly.types.push({ type: 'integer' });
      const componentCard = new ExportableCardRule('component');
      componentCard.min = 1;
      componentCard.max = '*';
      const componentFlag = new ExportableFlagRule('component.value[x]');
      componentFlag.mustSupport = true;
      const componentOnly = new ExportableOnlyRule('component.value[x]');
      componentOnly.types.push({ type: 'Quantity' }, { type: 'Ratio' });
      profile.rules.push(valueCard, valueOnly, componentCard, componentFlag, componentOnly);

      // Profile: MyObservation
      // Parent: Observation
      // * value[x] 1..1
      // * value[x] only integer
      // * component 1..*
      //   * value[x] MS
      //   * value[x] only Quantity or Ratio
      const expectedValueCard = cloneDeep(valueCard);
      expectedValueCard.indent = 0;
      const expectedValueOnly = cloneDeep(valueOnly);
      expectedValueOnly.indent = 0;
      const expectedComponentCard = cloneDeep(componentCard);
      expectedComponentCard.indent = 0;
      const expectedComponentFlag = cloneDeep(componentFlag);
      expectedComponentFlag.indent = 1;
      expectedComponentFlag.path = 'value[x]';
      const expectedComponentOnly = cloneDeep(componentOnly);
      expectedComponentOnly.indent = 1;
      expectedComponentOnly.path = 'value[x]';

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([
        expectedValueCard,
        expectedValueOnly,
        expectedComponentCard,
        expectedComponentFlag,
        expectedComponentOnly
      ]);
    });

    it('should indent based on path rules', () => {
      // Instance: ChainsawPatient
      // InstanceOf: Patient
      // Usage: #example
      // * address
      // * address.city = "Tokyo"
      // * address.country = "CN"
      const instance = new ExportableInstance('ChainsawPatient');
      instance.instanceOf = 'Patient';
      instance.usage = 'Example';
      const addressPathRule = new ExportablePathRule('address');
      const tokyoCity = new ExportableAssignmentRule('address.city');
      tokyoCity.value = 'Tokyo';
      const chinaCountry = new ExportableAssignmentRule('address.country');
      chinaCountry.value = 'CN';
      instance.rules.push(addressPathRule, tokyoCity, chinaCountry);

      // Instance: ChainsawPatient
      // InstanceOf: Patient
      // Usage: #example
      // * address
      //   * city = "Tokyo"
      //   * country = "CN"
      const expectedPathRule = cloneDeep(addressPathRule);
      expectedPathRule.indent = 0;
      const expectedTokyoCity = new ExportableAssignmentRule('city');
      expectedTokyoCity.value = 'Tokyo';
      expectedTokyoCity.indent = 1;
      const expectedChinaCountry = new ExportableAssignmentRule('country');
      expectedChinaCountry.value = 'CN';
      expectedChinaCountry.indent = 1;

      myPackage.add(instance);
      optimizer.optimize(myPackage);
      expect(instance.rules).toEqual([expectedPathRule, expectedTokyoCity, expectedChinaCountry]);
    });
  });
});
