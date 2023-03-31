import path from 'path';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableInstance,
  ExportableProfile
} from '../../../src/exportable';
import { MasterFisher } from '../../../src/utils';
import { loadTestDefinitions, stockLake } from '../../helpers';
import optimizer from '../../../src/optimizer/plugins/SimplifyInstanceNameOptimizer';
import ResolveInstanceOfURLsOptimizer from '../../../src/optimizer/plugins/ResolveInstanceOfURLsOptimizer';

describe('optimizer', () => {
  describe('#simplify_instance_names', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('simplify_instance_names');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toEqual([ResolveInstanceOfURLsOptimizer.name]);
    });

    it('should make instance names unique and add id rule to retain original id', () => {
      const instance1 = new ExportableInstance('MyExample');
      instance1.instanceOf = 'Condition';
      instance1.name = 'MyExample-of-Condition';
      const instance2 = new ExportableInstance('MyExample');
      instance2.instanceOf = 'Patient';
      instance2.name = 'MyExample-of-Patient';
      const instance3 = new ExportableInstance('MyObservationExample');
      instance3.instanceOf = 'Observation';
      instance3.name = 'MyObservationExample-of-Observation';
      const bundle = new ExportableInstance('MyBundleExample');
      bundle.instanceOf = 'Bundle';
      const bundleRule1 = new ExportableAssignmentRule('entry[0].resource');
      bundleRule1.isInstance = true;
      bundleRule1.value = 'MyExample-of-Condition';
      const bundleRule2 = new ExportableAssignmentRule('entry[1].resource');
      bundleRule2.isInstance = true;
      bundleRule2.value = 'MyObservationExample-of-Observation';
      bundle.rules = [bundleRule1, bundleRule2];
      const myPackage = new Package();
      myPackage.add(instance1);
      myPackage.add(instance2);
      myPackage.add(instance3);
      myPackage.add(bundle);
      optimizer.optimize(myPackage);

      // Check that instances were renamed when appropriate
      const myExampleIdRule = new ExportableAssignmentRule('id');
      myExampleIdRule.value = 'MyExample';
      const expectedInstance1 = new ExportableInstance('MyExample');
      expectedInstance1.instanceOf = 'Condition';
      expectedInstance1.name = 'MyExample-of-Condition'; // No name simplification since it will conflict with other instances
      expectedInstance1.rules = [myExampleIdRule];
      const expectedInstance2 = new ExportableInstance('MyExample');
      expectedInstance2.instanceOf = 'Patient';
      expectedInstance2.name = 'MyExample-of-Patient'; // No name simplification since it will conflict with other instances
      expectedInstance2.rules = [myExampleIdRule];
      const expectedInstance3 = new ExportableInstance('MyObservationExample');
      expectedInstance3.instanceOf = 'Observation';
      expectedInstance3.name = 'MyObservationExample'; // Name simplification since it didn't conflict with any other instances
      // NOTE: expectedInstance3 should not have id rule since name matches id
      // Now check that names have been updated in inline assignments
      const expectedBundle = new ExportableInstance('MyBundleExample');
      expectedBundle.instanceOf = 'Bundle';
      const expectedBundleRule1 = new ExportableAssignmentRule('entry[0].resource');
      expectedBundleRule1.isInstance = true;
      expectedBundleRule1.value = 'MyExample-of-Condition'; // This name did not get changed
      const expectedBundleRule2 = new ExportableAssignmentRule('entry[1].resource');
      expectedBundleRule2.isInstance = true;
      expectedBundleRule2.value = 'MyObservationExample'; // This name was changed
      expectedBundle.rules = [expectedBundleRule1, expectedBundleRule2];
      expect(myPackage.instances).toEqual([
        expectedInstance1,
        expectedInstance2,
        expectedInstance3,
        expectedBundle
      ]);
    });

    it('should simplify names with aliased InstanceOf and add id rule to retain original id', () => {
      const defs = loadTestDefinitions();
      const lake = stockLake(path.join(__dirname, 'fixtures', 'small-profile.json'));
      const fisher = new MasterFisher(lake, defs);

      const instance1 = new ExportableInstance('MyExample');
      instance1.instanceOf = 'http://hl7.org/fhir/us/foo/StructureDefinition/foo-profile';
      instance1.name = 'MyExample-of-http://hl7.org/fhir/us/foo/StructureDefinition/foo-profile';
      const instance2 = new ExportableInstance('MyExample');
      instance2.instanceOf = 'http://hl7.org/fhir/us/foo/StructureDefinition/bar-profile';
      instance2.name = 'MyExample-of-http://hl7.org/fhir/us/foo/StructureDefinition/bar-profile';
      const bundle = new ExportableInstance('MyBundleExample');
      bundle.instanceOf = 'Bundle';
      const bundleRule1 = new ExportableAssignmentRule('entry[0].resource');
      bundleRule1.isInstance = true;
      bundleRule1.value = 'MyExample-of-http://hl7.org/fhir/us/foo/StructureDefinition/foo-profile';
      const bundleRule2 = new ExportableAssignmentRule('entry[1].resource');
      bundleRule2.isInstance = true;
      bundleRule2.value = 'MyExample-of-http://hl7.org/fhir/us/foo/StructureDefinition/bar-profile';
      bundle.rules = [bundleRule1, bundleRule2];
      const myPackage = new Package();
      myPackage.add(instance1);
      myPackage.add(instance2);
      myPackage.add(bundle);

      // Resolve InstanceOf URLs first, then simplify Instance names to check they are updated according to the alias
      ResolveInstanceOfURLsOptimizer.optimize(myPackage, fisher);
      optimizer.optimize(myPackage);

      // Check that instances were renamed when appropriate
      const myExampleIdRule = new ExportableAssignmentRule('id');
      myExampleIdRule.value = 'MyExample';
      const expectedInstance1 = new ExportableInstance('MyExample');
      expectedInstance1.instanceOf = '$foo-profile';
      expectedInstance1.name = 'MyExample-of-$foo-profile';
      expectedInstance1.rules = [myExampleIdRule];
      const expectedInstance2 = new ExportableInstance('MyExample');
      expectedInstance2.instanceOf = '$bar-profile';
      expectedInstance2.name = 'MyExample-of-$bar-profile';
      expectedInstance2.rules = [myExampleIdRule];
      // Now check that names have been updated in inline assignments
      const expectedBundle = new ExportableInstance('MyBundleExample');
      expectedBundle.instanceOf = 'Bundle';
      const expectedBundleRule1 = new ExportableAssignmentRule('entry[0].resource');
      expectedBundleRule1.isInstance = true;
      expectedBundleRule1.value = 'MyExample-of-$foo-profile';
      const expectedBundleRule2 = new ExportableAssignmentRule('entry[1].resource');
      expectedBundleRule2.isInstance = true;
      expectedBundleRule2.value = 'MyExample-of-$bar-profile';
      expectedBundle.rules = [expectedBundleRule1, expectedBundleRule2];
      expect(myPackage.instances).toEqual([expectedInstance1, expectedInstance2, expectedBundle]);
    });

    it('should updated inlined contained rules in a profile when the inline instance name changes', () => {
      const instance1 = new ExportableInstance('AmazingThings');
      instance1.instanceOf = 'CodeSystem';
      instance1.name = 'AmazingThings-of-CodeSystem';
      const instance2 = new ExportableInstance('AmazingThings');
      instance2.instanceOf = 'ValueSet';
      instance2.name = 'AmazingThings-of-ValueSet';
      const instance3 = new ExportableInstance('OtherAmazingThings');
      instance3.instanceOf = 'ValueSet';
      instance3.name = 'OtherAmazingThings-of-ValueSet';
      const profile = new ExportableProfile('MyObservationProfile');
      profile.parent = 'Observation';
      const profileContainedRule1 = new ExportableCaretValueRule('.');
      profileContainedRule1.caretPath = 'contained[0]';
      profileContainedRule1.isInstance = true;
      profileContainedRule1.value = 'AmazingThings-of-CodeSystem';
      const profileContainedRule2 = new ExportableCaretValueRule('.');
      profileContainedRule2.caretPath = 'contained[1]';
      profileContainedRule2.isInstance = true;
      profileContainedRule2.value = 'AmazingThings-of-ValueSet';
      const profileContainedRule3 = new ExportableCaretValueRule('.');
      profileContainedRule3.caretPath = 'contained[2]';
      profileContainedRule3.isInstance = true;
      profileContainedRule3.value = 'OtherAmazingThings-of-ValueSet';
      profile.rules = [profileContainedRule1, profileContainedRule2, profileContainedRule3];
      const myPackage = new Package();
      myPackage.add(instance1);
      myPackage.add(instance2);
      myPackage.add(instance3);
      myPackage.add(profile);
      optimizer.optimize(myPackage);

      // Check that instances were renamed when appropriate
      const amazingThingsIdRule = new ExportableAssignmentRule('id');
      amazingThingsIdRule.value = 'AmazingThings';
      const expectedInstance1 = new ExportableInstance('AmazingThings');
      expectedInstance1.instanceOf = 'CodeSystem';
      expectedInstance1.name = 'AmazingThings-of-CodeSystem'; // No name simplification since it will conflict with other instances
      expectedInstance1.rules = [amazingThingsIdRule];
      const expectedInstance2 = new ExportableInstance('AmazingThings');
      expectedInstance2.instanceOf = 'ValueSet';
      expectedInstance2.name = 'AmazingThings-of-ValueSet'; // No name simplification since it will conflict with other instances
      expectedInstance2.rules = [amazingThingsIdRule];
      const expectedInstance3 = new ExportableInstance('OtherAmazingThings');
      expectedInstance3.instanceOf = 'ValueSet';
      expectedInstance3.name = 'OtherAmazingThings'; // Name simplification since it didn't conflict with any other instances
      // NOTE: expectedInstance3 should not have id rule since name matches id
      // Now check that names have been updated in inline assignments
      const expectedProfile = new ExportableProfile('MyObservationProfile');
      expectedProfile.parent = 'Observation';
      const expectedProfileRule1 = new ExportableCaretValueRule('.');
      expectedProfileRule1.caretPath = 'contained[0]';
      expectedProfileRule1.isInstance = true;
      expectedProfileRule1.value = 'AmazingThings-of-CodeSystem'; // This name did not get changed
      const expectedProfileRule2 = new ExportableCaretValueRule('.');
      expectedProfileRule2.caretPath = 'contained[1]';
      expectedProfileRule2.isInstance = true;
      expectedProfileRule2.value = 'AmazingThings-of-ValueSet'; // This name did not get changed
      const expectedProfileRule3 = new ExportableCaretValueRule('.');
      expectedProfileRule3.caretPath = 'contained[2]';
      expectedProfileRule3.isInstance = true;
      expectedProfileRule3.value = 'OtherAmazingThings'; // This name was changed
      expectedProfile.rules = [expectedProfileRule1, expectedProfileRule2, expectedProfileRule3];
      expect(myPackage.instances).toEqual([
        expectedInstance1,
        expectedInstance2,
        expectedInstance3
      ]);
      expect(myPackage.profiles).toEqual([expectedProfile]);
    });
  });
});
