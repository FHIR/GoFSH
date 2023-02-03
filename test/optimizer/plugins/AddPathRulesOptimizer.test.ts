import optimizer from '../../../src/optimizer/plugins/AddPathRulesOptimizer';
import {
  ExportableInstance,
  ExportableAssignmentRule,
  ExportablePathRule,
  ExportableProfile,
  ExportableFlagRule,
  ExportableCaretValueRule,
  ExportableOnlyRule,
  ExportableCardRule
} from '../../../src/exportable';
import { Package } from '../../../src/processor';
import { fshtypes } from 'fsh-sushi';

describe('optimizer', () => {
  describe('add_rule_paths', () => {
    let myPackage: Package;

    beforeEach(() => {
      myPackage = new Package();
    });

    it('should add path rules based on repeated parent paths', () => {
      // Instance: ChainsawPatient
      // InstanceOf: Patient
      // Usage: #example
      // * address.city = "Tokyo"
      // * address.country = "JP"
      const instance = new ExportableInstance('ChainsawPatient');
      instance.instanceOf = 'Patient';
      instance.usage = 'Example';
      const tokyoCity = new ExportableAssignmentRule('address.city');
      tokyoCity.value = 'Tokyo';
      const japanCountry = new ExportableAssignmentRule('address.country');
      japanCountry.value = 'JP';
      instance.rules.push(tokyoCity, japanCountry);

      // Instance: ChainsawPatient
      // InstanceOf: Patient
      // Usage: #example
      // * address
      // * address.city = "Tokyo"
      // * address.country = "JP"
      const addressPathRule = new ExportablePathRule('address');

      myPackage.add(instance);
      optimizer.optimize(myPackage);
      expect(instance.rules).toEqual([addressPathRule, tokyoCity, japanCountry]);
    });

    it('should add path rules if the parent paths are numbered', () => {
      // Instance: ChainsawPatient
      // InstanceOf: Patient
      // Usage: #example
      // * address[0].city = "Shanghai"
      // * address[0].country = "CN"
      // * address[1].city = "Sydney"
      // * address[1].country = "AU"

      const instance = new ExportableInstance('ChainsawPatient');
      instance.instanceOf = 'Patient';
      instance.usage = 'Example';
      const tokyoCity = new ExportableAssignmentRule('address[0].city');
      tokyoCity.value = 'Tokyo';
      const japanCountry = new ExportableAssignmentRule('address[0].country');
      japanCountry.value = 'JP';
      const sydneyCity = new ExportableAssignmentRule('address[1].city');
      sydneyCity.value = 'Sydney';
      const australiaCountry = new ExportableAssignmentRule('address[1].country');
      australiaCountry.value = 'AU';
      instance.rules.push(tokyoCity, japanCountry, sydneyCity, australiaCountry);

      // Instance: ChainsawPatient
      // InstanceOf: Patient
      // Usage: #example
      // * address[0]
      // * address[0].city = "Shanghai"
      // * address[0].country = "CN"
      // * address[1]
      // * address[1].city = "Syndney"
      // * address[1].country = "AU"

      const expectedPathRule0 = new ExportablePathRule('address[0]');
      const expectedPathRule1 = new ExportablePathRule('address[1]');

      myPackage.add(instance);
      optimizer.optimize(myPackage);
      expect(instance.rules).toEqual([
        expectedPathRule0,
        tokyoCity,
        japanCountry,
        expectedPathRule1,
        sydneyCity,
        australiaCountry
      ]);
    });

    it('should add path rules for deeper paths', () => {
      // Instance: ChainsawPatient
      // InstanceOf: Patient
      // Usage: #example
      // * address.city = "Tokyo"
      // * address.country = "JP"
      // * address.period.start = "2021-01-01"
      // * address.period.end = "2021-12-31"
      const instance = new ExportableInstance('ChainsawPatient');
      instance.instanceOf = 'Patient';
      instance.usage = 'Example';
      const tokyoCity = new ExportableAssignmentRule('address.city');
      tokyoCity.value = 'Tokyo';
      const japanCountry = new ExportableAssignmentRule('address.country');
      japanCountry.value = 'JP';
      const startPeriod = new ExportableAssignmentRule('address.period.start');
      startPeriod.value = '2021-01-01';
      const endPeriod = new ExportableAssignmentRule('address.period.end');
      endPeriod.value = '2021-12-31';
      instance.rules.push(tokyoCity, japanCountry, startPeriod, endPeriod);

      // Instance: ChainsawPatient
      // InstanceOf: Patient
      // Usage: #example
      // * address
      // * address.city = "Tokyo"
      // * address.country = "JP"
      // * address.period
      // * address.period.start = "2021-01-01"
      // * address.period.end = "2021-12-31"
      const expectedPathRule = new ExportablePathRule('address');
      const expectedPeriodRule = new ExportablePathRule('address.period');

      myPackage.add(instance);
      optimizer.optimize(myPackage);
      expect(instance.rules).toEqual([
        expectedPathRule,
        tokyoCity,
        japanCountry,
        expectedPeriodRule,
        startPeriod,
        endPeriod
      ]);
    });

    it('should add path rules for deeper paths with numeric indices', () => {
      // Instance: ExtendedPatient
      // InstanceOf: Patient
      // Usage: #example
      // * birthDate.extension[0].url = "http://example.com/party"
      // * birthDate.extension[0].valueString = "surprise"
      // * birthDate.extension[1].url = "http://example.com/cake"
      // * birthDate.extension[1].valueString = "ice cream"
      const instance = new ExportableInstance('ExtendedPatient');
      instance.instanceOf = 'Patient';
      instance.usage = 'Example';
      const partyExtensionUrl = new ExportableAssignmentRule('birthDate.extension[0].url');
      partyExtensionUrl.value = 'http://example.com/party';
      const partyExtensionValueString = new ExportableAssignmentRule(
        'birthDate.extension[0].valueString'
      );
      partyExtensionValueString.value = 'surprise';
      const cakeExtensionUrl = new ExportableAssignmentRule('birthDate.extension[1].url');
      cakeExtensionUrl.value = 'http://example.com/cake';
      const cakeExtensionValueString = new ExportableAssignmentRule(
        'birthDate.extension[1].valueString'
      );
      cakeExtensionValueString.value = 'ice cream';
      instance.rules.push(
        partyExtensionUrl,
        partyExtensionValueString,
        cakeExtensionUrl,
        cakeExtensionValueString
      );
      myPackage.add(instance);

      optimizer.optimize(myPackage);

      // Instance: ExtendedPatient
      // InstanceOf: Patient
      // Usage: #example
      // * birthDate
      // * birthDate.extension[0]
      // * birthDate.extension[0].url = "http://example.com/party"
      // * birthDate.extension[0].valueString = "surprise"
      // * birthDate.extension[1]
      // * birthDate.extension[1].url = "http://example.com/cake"
      // * birthDate.extension[1].valueString = "ice cream"

      const birthDatePathRule = new ExportablePathRule('birthDate');
      const partyPathRule = new ExportablePathRule('birthDate.extension[0]');
      const cakePathRule = new ExportablePathRule('birthDate.extension[1]');
      expect(instance.rules).toEqual([
        birthDatePathRule,
        partyPathRule,
        partyExtensionUrl,
        partyExtensionValueString,
        cakePathRule,
        cakeExtensionUrl,
        cakeExtensionValueString
      ]);
    });

    it('should add path rules for common ancestor paths even when rules paths are different depths', () => {
      // Instance: ChainsawPatient
      // InstanceOf: Patient
      // Usage: #example
      // * address.country = "JP"
      // * address.period.start = "2021-01-01"
      const instance = new ExportableInstance('ChainsawPatient');
      instance.instanceOf = 'Patient';
      instance.usage = 'Example';
      const japanCountry = new ExportableAssignmentRule('address.country');
      japanCountry.value = 'JP';
      const startPeriod = new ExportableAssignmentRule('address.period.start');
      startPeriod.value = '2021-01-01';
      instance.rules.push(japanCountry, startPeriod);

      // Instance: ChainsawPatient
      // InstanceOf: Patient
      // Usage: #example
      // * address
      // * address.country = "JP"
      // * address.period.start = "2021-01-01"
      const expectedPathRule = new ExportablePathRule('address');

      myPackage.add(instance);
      optimizer.optimize(myPackage);
      expect(instance.rules).toEqual([expectedPathRule, japanCountry, startPeriod]);
    });

    it('should not add path rules when previous rule already has parent path', () => {
      // Instance: ChainsawPatient
      // InstanceOf: Patient
      // Usage: #example
      // * maritalStatus = http://terminology.hl7.org/CodeSystem/v3-MaritalStatus#Married
      // * maritalStatus.coding.userSelected = true
      // * maritalStatus.text = "Married"
      const instance = new ExportableInstance('ChainsawPatient');
      instance.instanceOf = 'Patient';
      instance.usage = 'Example';
      const maritalStatus = new ExportableAssignmentRule('maritalStatus');
      maritalStatus.value = new fshtypes.FshCode(
        'Married',
        'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus'
      );
      const martialStatusUserSelected = new ExportableAssignmentRule(
        'maritalStatus.coding.userSelected'
      );
      martialStatusUserSelected.value = true;
      const martialStatusText = new ExportableAssignmentRule('maritalStatus.text');
      martialStatusText.value = 'Married';
      instance.rules.push(maritalStatus, martialStatusUserSelected, martialStatusText);

      // The above definition should not be affected at all

      myPackage.add(instance);
      optimizer.optimize(myPackage);
      expect(instance.rules).toEqual([maritalStatus, martialStatusUserSelected, martialStatusText]);
    });

    it('should not add path rules when previous rule already has parent path', () => {
      // Instance: ChainsawPatient
      // InstanceOf: Patient
      // Usage: #example
      // * maritalStatus.coding = http://terminology.hl7.org/CodeSystem/v3-MaritalStatus#Married
      // * maritalStatus.coding.version = "2.1.0"
      // * maritalStatus.coding.userSelected = true
      const instance = new ExportableInstance('ChainsawPatient');
      instance.instanceOf = 'Patient';
      instance.usage = 'Example';
      const maritalStatusCoding = new ExportableAssignmentRule('maritalStatus.coding');
      maritalStatusCoding.value = new fshtypes.FshCode(
        'Married',
        'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus'
      );
      const martialStatusVersion = new ExportableAssignmentRule('maritalStatus.coding.version');
      martialStatusVersion.value = '2.1.0';
      const martialStatusUserSelected = new ExportableAssignmentRule(
        'maritalStatus.coding.userSelected'
      );
      martialStatusUserSelected.value = true;
      instance.rules.push(maritalStatusCoding, martialStatusVersion, martialStatusUserSelected);

      // Instance: ChainsawPatient
      // InstanceOf: Patient
      // Usage: #example
      // * maritalStatus.coding = http://terminology.hl7.org/CodeSystem/v3-MaritalStatus#Married
      // * maritalStatus.coding.version = "2.1.0"
      // * maritalStatus.coding.userSelected = true

      // NOTE: maritalStatus and maritalStatus.coding path rules are not needed because
      // maritalStatus.coding assignment rule sets sufficient context

      myPackage.add(instance);
      optimizer.optimize(myPackage);
      expect(instance.rules).toEqual([
        maritalStatusCoding,
        martialStatusVersion,
        martialStatusUserSelected
      ]);
    });

    it('should add path rules and reorder assignment rules to set optimal context', () => {
      // Instance: ObservationWithValueCC
      // InstanceOf: Observation
      // Usage: #example
      // * valueCodeableConcept.coding.extension.url = "http://example.com/important-value"
      // * valueCodeableConcept.coding.extension.valueDecimal = 2
      // * valueCodeableConcept.coding = http://example.com#12345 "Favorite Numbers"
      // * valueCodeableConcept.text = "2. Favorite and Important"
      const instance = new ExportableInstance('ObservationWithValueCC');
      instance.instanceOf = 'Observation';
      instance.usage = 'Example';
      const ccCodingExtUrl = new ExportableAssignmentRule(
        'valueCodeableConcept.coding.extension.url'
      );
      ccCodingExtUrl.value = 'http://example.com/important-value';
      const ccCodingExtValue = new ExportableAssignmentRule(
        'valueCodeableConcept.coding.extension.valueDecimal'
      );
      ccCodingExtValue.value = '2';
      const ccCoding = new ExportableAssignmentRule('valueCodeableConcept.coding');
      ccCoding.value = new fshtypes.FshCode('12345', 'http://example.com', 'Favorite Numbers');
      const ccText = new ExportableAssignmentRule('valueCodeableConcept.text');
      ccText.value = '2. Favorite and Important';
      instance.rules.push(ccCodingExtUrl, ccCodingExtValue, ccCoding, ccText);

      myPackage.add(instance);
      optimizer.optimize(myPackage);

      // Instance: ObservationWithValueCC
      // InstanceOf: Observation
      // Usage: #example
      // * valueCodeableConcept
      // * valueCodeableConcept.coding = http://example.com#12345 "Favorite Numbers"
      // * valueCodeableConcept.coding.extension
      // * valueCodeableConcept.coding.extension.url = "http://example.com/important-value"
      // * valueCodeableConcept.coding.extension.valueDecimal = 2
      // * valueCodeableConcept.text = "2. Favorite and Important"

      const ccPathRule = new ExportablePathRule('valueCodeableConcept');
      const ccCodingExtPathRule = new ExportablePathRule('valueCodeableConcept.coding.extension');
      expect(instance.rules).toEqual([
        ccPathRule, // path rule added
        ccCoding, // coding moved before coding.extension rules to properly set context in later optimizer
        ccCodingExtPathRule, // path rule added
        ccCodingExtUrl,
        ccCodingExtValue,
        ccText
      ]);
    });

    it('should add path rules for profiles', () => {
      // Profile: MyPatient
      // Parent: Patient
      // * name.given MS
      // * name.family MS
      const profile = new ExportableProfile('MyPatient');
      profile.parent = 'Patient';
      const nameGivenRule = new ExportableFlagRule('name.given');
      nameGivenRule.mustSupport = true;
      const nameFamilyRule = new ExportableFlagRule('name.family');
      nameFamilyRule.mustSupport = true;
      profile.rules.push(nameGivenRule, nameFamilyRule);

      // Profile: MyPatient
      // Parent: Patient
      // * name
      // * name.given MS
      // * name.family MS
      const expectedNameRule = new ExportablePathRule('name');

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([expectedNameRule, nameGivenRule, nameFamilyRule]);
    });

    it('should handle caret value rules with no path', () => {
      // Profile: VersionedObservation
      // Parent: Observation
      // * ^version = "2.3.0"
      // * ^status = #draft
      const profile = new ExportableProfile('VersionedObservation');
      profile.parent = 'Observation';
      const versionRule = new ExportableCaretValueRule('');
      versionRule.caretPath = 'version';
      versionRule.value = '2.3.0';
      const statusRule = new ExportableCaretValueRule('');
      statusRule.caretPath = 'status';
      statusRule.value = new fshtypes.FshCode('draft');
      profile.rules.push(versionRule, statusRule);

      myPackage.add(profile);
      optimizer.optimize(myPackage);

      // Keeps both rules at same path, different caret path
      expect(profile.rules).toEqual([versionRule, statusRule]);
    });

    it('should handle . ^caret rules', () => {
      // Profile: EDChangesObservation
      // Parent: Observation
      // * . ^short = "Brief test"
      // * . ^definition = "My definition."
      // * . ^comment = "Well created!"
      const profile = new ExportableProfile('EDChangesObservation');
      profile.parent = 'Observation';
      const short = new ExportableCaretValueRule('.');
      short.caretPath = 'short';
      short.value = 'Brief test';
      const definition = new ExportableCaretValueRule('.');
      definition.caretPath = 'definition';
      definition.value = 'My definition.';
      const comment = new ExportableCaretValueRule('.');
      comment.caretPath = 'comment';
      comment.value = 'Well created!';
      profile.rules.push(short, definition, comment);

      myPackage.add(profile);
      optimizer.optimize(myPackage);

      expect(profile.rules).toEqual([short, definition, comment]);
    });

    it('should handle caret values on paths', () => {
      // Profile: CategoryCaretObservation
      // Parent: Observation
      // * category ^slicing.ordered = false
      // * category ^slicing.rules = #open
      const profile = new ExportableProfile('CategoryCaretObservation');
      profile.parent = 'Observation';
      const categorySlicingOrdered = new ExportableCaretValueRule('category');
      categorySlicingOrdered.caretPath = 'slicing.ordered';
      categorySlicingOrdered.value = false;
      const categorySlicingRules = new ExportableCaretValueRule('category');
      categorySlicingRules.caretPath = 'slicing.rules';
      categorySlicingRules.value = new fshtypes.FshCode('open');
      profile.rules.push(categorySlicingOrdered, categorySlicingRules);

      myPackage.add(profile);
      optimizer.optimize(myPackage);

      expect(profile.rules).toEqual([categorySlicingOrdered, categorySlicingRules]);
    });

    it('should handle caret paths after another rule', () => {
      // Profile: CategoryCaretObservation
      // Parent: Observation
      // * category only CodeableConcept
      // * category ^slicing.ordered = false
      // * category ^slicing.rules = #open
      const profile = new ExportableProfile('CategoryCaretObservation');
      profile.parent = 'Observation';
      const categoryOnlyCC = new ExportableOnlyRule('category');
      categoryOnlyCC.types = [{ type: 'CodeableConcept' }];
      const categorySlicingOrdered = new ExportableCaretValueRule('category');
      categorySlicingOrdered.caretPath = 'slicing.ordered';
      categorySlicingOrdered.value = false;
      const categorySlicingRules = new ExportableCaretValueRule('category');
      categorySlicingRules.caretPath = 'slicing.rules';
      categorySlicingRules.value = new fshtypes.FshCode('open');
      profile.rules.push(categoryOnlyCC, categorySlicingOrdered, categorySlicingRules);

      myPackage.add(profile);
      optimizer.optimize(myPackage);

      expect(profile.rules).toEqual([categoryOnlyCC, categorySlicingOrdered, categorySlicingRules]);
    });

    it('should handle paths that require multiple rules at the same path', () => {
      // Profile: MultipleRulesPerPathObs
      // Parent: Observation
      // * category 1..1 MS
      // * category only CodeableConcept
      // * category.coding 1..* MS
      // * category.coding only Coding
      // * category.coding.system 1..1 MS
      // * category.coding.system only uri
      const profile = new ExportableProfile('MultipleRulesPerPathObs');
      profile.parent = 'Observation';
      const categoryCard = new ExportableCardRule('category');
      categoryCard.min = 1;
      categoryCard.max = '1';
      const categoryMS = new ExportableFlagRule('category');
      categoryMS.mustSupport = true;
      const categoryOnlyCC = new ExportableOnlyRule('category');
      categoryOnlyCC.types = [{ type: 'CodeableConcept' }];

      const categoryCodingCard = new ExportableCardRule('category.coding');
      categoryCodingCard.min = 1;
      categoryCodingCard.max = '*';
      const categoryCodingMS = new ExportableFlagRule('category.coding');
      categoryCodingMS.mustSupport = true;
      const categoryCodingOnlyCC = new ExportableOnlyRule('category.coding');
      categoryCodingOnlyCC.types = [{ type: 'Coding' }];

      const categoryCodingSystemCard = new ExportableCardRule('category.coding.system');
      categoryCodingSystemCard.min = 1;
      categoryCodingSystemCard.max = '1';
      const categoryCodingSystemMS = new ExportableFlagRule('category.coding.system');
      categoryCodingSystemMS.mustSupport = true;
      const categoryCodingSystemOnlyCC = new ExportableOnlyRule('category.coding.system');
      categoryCodingSystemOnlyCC.types = [{ type: 'uri' }];

      profile.rules.push(
        categoryCard,
        categoryMS,
        categoryOnlyCC,
        categoryCodingCard,
        categoryCodingMS,
        categoryCodingOnlyCC,
        categoryCodingSystemCard,
        categoryCodingSystemMS,
        categoryCodingSystemOnlyCC
      );

      myPackage.add(profile);
      optimizer.optimize(myPackage);

      expect(profile.rules).toEqual([
        categoryCard,
        categoryMS,
        categoryOnlyCC,
        categoryCodingCard,
        categoryCodingMS,
        categoryCodingOnlyCC,
        categoryCodingSystemCard,
        categoryCodingSystemMS,
        categoryCodingSystemOnlyCC
      ]);
    });

    it('should optimize order for rules that require multiple rules at the same path', () => {
      // Profile: MultipleRulesPerPathObs
      // Parent: Observation
      // * category 1..1 MS
      // * category only CodeableConcept
      // * category.coding 1..* MS
      // * category.coding only Coding
      // * category.coding.system 1..1 MS
      // * category.coding.system only uri
      const profile = new ExportableProfile('MultipleRulesPerPathObs');
      profile.parent = 'Observation';
      const categoryCard = new ExportableCardRule('category');
      categoryCard.min = 1;
      categoryCard.max = '1';
      const categoryMS = new ExportableFlagRule('category');
      categoryMS.mustSupport = true;
      const categoryOnlyCC = new ExportableOnlyRule('category');
      categoryOnlyCC.types = [{ type: 'CodeableConcept' }];

      const categoryCodingCard = new ExportableCardRule('category.coding');
      categoryCodingCard.min = 1;
      categoryCodingCard.max = '*';
      const categoryCodingMS = new ExportableFlagRule('category.coding');
      categoryCodingMS.mustSupport = true;
      const categoryCodingOnlyCC = new ExportableOnlyRule('category.coding');
      categoryCodingOnlyCC.types = [{ type: 'Coding' }];

      const categoryCodingSystemCard = new ExportableCardRule('category.coding.system');
      categoryCodingSystemCard.min = 1;
      categoryCodingSystemCard.max = '1';
      const categoryCodingSystemMS = new ExportableFlagRule('category.coding.system');
      categoryCodingSystemMS.mustSupport = true;
      const categoryCodingSystemOnlyCC = new ExportableOnlyRule('category.coding.system');
      categoryCodingSystemOnlyCC.types = [{ type: 'uri' }];

      profile.rules.push(
        categoryCard,
        categoryMS,
        categoryCodingCard,
        categoryCodingMS,
        categoryCodingSystemCard,
        categoryCodingSystemMS,
        categoryCodingSystemOnlyCC,
        categoryCodingOnlyCC, // at the end
        categoryOnlyCC // at the end
      );

      myPackage.add(profile);
      optimizer.optimize(myPackage);

      // Back to optimized order
      expect(profile.rules).toEqual([
        categoryCard,
        categoryMS,
        categoryOnlyCC, // moved earlier
        categoryCodingCard,
        categoryCodingMS,
        categoryCodingOnlyCC, // moved earlier
        categoryCodingSystemCard,
        categoryCodingSystemMS,
        categoryCodingSystemOnlyCC
      ]);
    });

    it('should sort caret rules above deeper path rules', () => {
      // Profile: CaretAbovePathsObservation
      // Parent: Observation
      // * component MS
      // * component.code MS
      // * component ^short = "This should be above component.code"
      const profile = new ExportableProfile('CaretAbovePathsObservation');
      profile.parent = 'Observation';
      const componentMS = new ExportableFlagRule('component');
      componentMS.mustSupport = true;
      const componentCodeMS = new ExportableFlagRule('component.code');
      componentCodeMS.mustSupport = true;
      const componentShort = new ExportableCaretValueRule('component');
      componentShort.caretPath = 'short';
      componentShort.value = 'This should be above component.code';
      profile.rules.push(componentMS, componentCodeMS, componentShort);

      myPackage.add(profile);
      optimizer.optimize(myPackage);

      expect(profile.rules).toEqual([
        componentMS,
        componentShort, // ^short comes before code
        componentCodeMS
      ]);
    });
  });
});
