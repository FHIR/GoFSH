import optimizer from '../../../src/optimizer/plugins/AddPathRulesOptimizer';
import {
  ExportableInstance,
  ExportableAssignmentRule,
  ExportablePathRule,
  ExportableProfile,
  ExportableFlagRule
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
      // * maritalStatus
      // * maritalStatus.coding = http://terminology.hl7.org/CodeSystem/v3-MaritalStatus#Married
      // * maritalStatus.coding.version = "2.1.0"
      // * maritalStatus.coding.userSelected = true

      // NOTE: maritalStatus should be added, but not maritalStatus.coding
      const expectedMaritalStatus = new ExportablePathRule('maritalStatus');

      myPackage.add(instance);
      optimizer.optimize(myPackage);
      expect(instance.rules).toEqual([
        expectedMaritalStatus,
        maritalStatusCoding,
        martialStatusVersion,
        martialStatusUserSelected
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
  });
});
