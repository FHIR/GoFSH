import optimizer from '../../../src/optimizer/plugins/AddPathRulesOptimizer';
import {
  ExportableInstance,
  ExportableAssignmentRule,
  ExportablePathRule,
  ExportableProfile,
  ExportableFlagRule
} from '../../../src/exportable';
import { Package } from '../../../src/processor';
import { cloneDeep } from 'lodash';

//test for profile too
//make sure indents are occuring in simplify rule path contexts optimizer
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
      const expectedPathRule = cloneDeep(addressPathRule);
      const expectedTokyoCity = new ExportableAssignmentRule('address.city');
      expectedTokyoCity.value = 'Tokyo';
      const expectedJapanCountry = new ExportableAssignmentRule('address.country');
      expectedJapanCountry.value = 'JP';

      myPackage.add(instance);
      optimizer.optimize(myPackage);
      expect(instance.rules).toEqual([expectedPathRule, expectedTokyoCity, expectedJapanCountry]);
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
      const expectedTokyoCity = cloneDeep(tokyoCity);
      const expectedJapanCountry = cloneDeep(japanCountry);
      const expectedPathRule1 = new ExportablePathRule('address[1]');
      const expectedSydneyCity = cloneDeep(sydneyCity);
      const expectedAustraliaCountry = cloneDeep(australiaCountry);

      myPackage.add(instance);
      optimizer.optimize(myPackage);
      expect(instance.rules).toEqual([
        expectedPathRule0,
        expectedTokyoCity,
        expectedJapanCountry,
        expectedPathRule1,
        expectedSydneyCity,
        expectedAustraliaCountry
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
      const expectedTokyoCity = cloneDeep(tokyoCity);
      const expectedJapanCountry = cloneDeep(japanCountry);
      const expectedPeriodRule = new ExportablePathRule('address.period');
      const expectedStartPeriod = cloneDeep(startPeriod);
      const expectedEndPeriod = cloneDeep(endPeriod);

      myPackage.add(instance);
      optimizer.optimize(myPackage);
      expect(instance.rules).toEqual([
        expectedPathRule,
        expectedTokyoCity,
        expectedJapanCountry,
        expectedPeriodRule,
        expectedStartPeriod,
        expectedEndPeriod
      ]);
    });

    it('should add path rules for deeper paths', () => {
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
    });
  });
});
