import path from 'path';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableCodeSystem,
  ExportableExtension,
  ExportableInstance,
  ExportableLogical,
  ExportableProfile,
  ExportableResource,
  ExportableValueSet
} from '../../../src/exportable';
import { MasterFisher } from '../../../src/utils';
import { loadTestDefinitions, stockLake } from '../../helpers';
import optimizer from '../../../src/optimizer/plugins/SimplifyInstanceNameOptimizer';
import ResolveInstanceOfURLsOptimizer from '../../../src/optimizer/plugins/ResolveInstanceOfURLsOptimizer';
import ConstructInlineInstanceOptimizer from '../../../src/optimizer/plugins/ConstructInlineInstanceOptimizer';

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

    it('should simplify names with aliased InstanceOf and add id rule to retain original id', async () => {
      const defs = await loadTestDefinitions();
      const lake = await stockLake(path.join(__dirname, 'fixtures', 'small-profile.json'));
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

    it('should update inlined contained rules in a profile when the contained instance name changes', () => {
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
      const containedRule1 = new ExportableCaretValueRule('');
      containedRule1.caretPath = 'contained[0]';
      containedRule1.isInstance = true;
      containedRule1.value = 'AmazingThings-of-CodeSystem';
      const containedRule2 = new ExportableCaretValueRule('');
      containedRule2.caretPath = 'contained[1]';
      containedRule2.isInstance = true;
      containedRule2.value = 'AmazingThings-of-ValueSet';
      const containedRule3 = new ExportableCaretValueRule('');
      containedRule3.caretPath = 'contained[2]';
      containedRule3.isInstance = true;
      containedRule3.value = 'OtherAmazingThings-of-ValueSet';
      profile.rules = [containedRule1, containedRule2, containedRule3];
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
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'contained[0]';
      expectedRule1.isInstance = true;
      expectedRule1.value = 'AmazingThings-of-CodeSystem'; // This name did not get changed
      const expectedRule2 = new ExportableCaretValueRule('');
      expectedRule2.caretPath = 'contained[1]';
      expectedRule2.isInstance = true;
      expectedRule2.value = 'AmazingThings-of-ValueSet'; // This name did not get changed
      const expectedRule3 = new ExportableCaretValueRule('');
      expectedRule3.caretPath = 'contained[2]';
      expectedRule3.isInstance = true;
      expectedRule3.value = 'OtherAmazingThings'; // This name was changed
      expectedProfile.rules = [expectedRule1, expectedRule2, expectedRule3];
      expect(myPackage.instances).toEqual([
        expectedInstance1,
        expectedInstance2,
        expectedInstance3
      ]);
      expect(myPackage.profiles).toEqual([expectedProfile]);
    });

    it('should update inlined contained rules in an extension when the contained instance name changes', () => {
      const instance1 = new ExportableInstance('AmazingThings');
      instance1.instanceOf = 'CodeSystem';
      instance1.name = 'AmazingThings-of-CodeSystem';
      const instance2 = new ExportableInstance('AmazingThings');
      instance2.instanceOf = 'ValueSet';
      instance2.name = 'AmazingThings-of-ValueSet';
      const instance3 = new ExportableInstance('OtherAmazingThings');
      instance3.instanceOf = 'ValueSet';
      instance3.name = 'OtherAmazingThings-of-ValueSet';
      const extension = new ExportableExtension('MyUsefulExtension');
      const containedRule1 = new ExportableCaretValueRule('');
      containedRule1.caretPath = 'contained[0]';
      containedRule1.isInstance = true;
      containedRule1.value = 'AmazingThings-of-CodeSystem';
      const containedRule2 = new ExportableCaretValueRule('');
      containedRule2.caretPath = 'contained[1]';
      containedRule2.isInstance = true;
      containedRule2.value = 'AmazingThings-of-ValueSet';
      const containedRule3 = new ExportableCaretValueRule('');
      containedRule3.caretPath = 'contained[2]';
      containedRule3.isInstance = true;
      containedRule3.value = 'OtherAmazingThings-of-ValueSet';
      extension.rules = [containedRule1, containedRule2, containedRule3];
      const myPackage = new Package();
      myPackage.add(instance1);
      myPackage.add(instance2);
      myPackage.add(instance3);
      myPackage.add(extension);
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
      const expectedExtension = new ExportableExtension('MyUsefulExtension');
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'contained[0]';
      expectedRule1.isInstance = true;
      expectedRule1.value = 'AmazingThings-of-CodeSystem'; // This name did not get changed
      const expectedRule2 = new ExportableCaretValueRule('');
      expectedRule2.caretPath = 'contained[1]';
      expectedRule2.isInstance = true;
      expectedRule2.value = 'AmazingThings-of-ValueSet'; // This name did not get changed
      const expectedRule3 = new ExportableCaretValueRule('');
      expectedRule3.caretPath = 'contained[2]';
      expectedRule3.isInstance = true;
      expectedRule3.value = 'OtherAmazingThings'; // This name was changed
      expectedExtension.rules = [expectedRule1, expectedRule2, expectedRule3];
      expect(myPackage.instances).toEqual([
        expectedInstance1,
        expectedInstance2,
        expectedInstance3
      ]);
      expect(myPackage.extensions).toEqual([expectedExtension]);
    });

    it('should update inlined contained rules in a logical when the contained instance name changes', () => {
      const instance1 = new ExportableInstance('AmazingThings');
      instance1.instanceOf = 'CodeSystem';
      instance1.name = 'AmazingThings-of-CodeSystem';
      const instance2 = new ExportableInstance('AmazingThings');
      instance2.instanceOf = 'ValueSet';
      instance2.name = 'AmazingThings-of-ValueSet';
      const instance3 = new ExportableInstance('OtherAmazingThings');
      instance3.instanceOf = 'ValueSet';
      instance3.name = 'OtherAmazingThings-of-ValueSet';
      const logical = new ExportableLogical('PretzelLogical');
      const containedRule1 = new ExportableCaretValueRule('');
      containedRule1.caretPath = 'contained[0]';
      containedRule1.isInstance = true;
      containedRule1.value = 'AmazingThings-of-CodeSystem';
      const containedRule2 = new ExportableCaretValueRule('');
      containedRule2.caretPath = 'contained[1]';
      containedRule2.isInstance = true;
      containedRule2.value = 'AmazingThings-of-ValueSet';
      const containedRule3 = new ExportableCaretValueRule('');
      containedRule3.caretPath = 'contained[2]';
      containedRule3.isInstance = true;
      containedRule3.value = 'OtherAmazingThings-of-ValueSet';
      logical.rules = [containedRule1, containedRule2, containedRule3];
      const myPackage = new Package();
      myPackage.add(instance1);
      myPackage.add(instance2);
      myPackage.add(instance3);
      myPackage.add(logical);
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
      const expectedLogical = new ExportableLogical('PretzelLogical');
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'contained[0]';
      expectedRule1.isInstance = true;
      expectedRule1.value = 'AmazingThings-of-CodeSystem'; // This name did not get changed
      const expectedRule2 = new ExportableCaretValueRule('');
      expectedRule2.caretPath = 'contained[1]';
      expectedRule2.isInstance = true;
      expectedRule2.value = 'AmazingThings-of-ValueSet'; // This name did not get changed
      const expectedRule3 = new ExportableCaretValueRule('');
      expectedRule3.caretPath = 'contained[2]';
      expectedRule3.isInstance = true;
      expectedRule3.value = 'OtherAmazingThings'; // This name was changed
      expectedLogical.rules = [expectedRule1, expectedRule2, expectedRule3];
      expect(myPackage.instances).toEqual([
        expectedInstance1,
        expectedInstance2,
        expectedInstance3
      ]);
      expect(myPackage.logicals).toEqual([expectedLogical]);
    });

    it('should update inlined contained rules in a resource when the contained instance name changes', () => {
      const instance1 = new ExportableInstance('AmazingThings');
      instance1.instanceOf = 'CodeSystem';
      instance1.name = 'AmazingThings-of-CodeSystem';
      const instance2 = new ExportableInstance('AmazingThings');
      instance2.instanceOf = 'ValueSet';
      instance2.name = 'AmazingThings-of-ValueSet';
      const instance3 = new ExportableInstance('OtherAmazingThings');
      instance3.instanceOf = 'ValueSet';
      instance3.name = 'OtherAmazingThings-of-ValueSet';
      const resource = new ExportableResource('Toast');
      const containedRule1 = new ExportableCaretValueRule('');
      containedRule1.caretPath = 'contained[0]';
      containedRule1.isInstance = true;
      containedRule1.value = 'AmazingThings-of-CodeSystem';
      const containedRule2 = new ExportableCaretValueRule('');
      containedRule2.caretPath = 'contained[1]';
      containedRule2.isInstance = true;
      containedRule2.value = 'AmazingThings-of-ValueSet';
      const containedRule3 = new ExportableCaretValueRule('');
      containedRule3.caretPath = 'contained[2]';
      containedRule3.isInstance = true;
      containedRule3.value = 'OtherAmazingThings-of-ValueSet';
      resource.rules = [containedRule1, containedRule2, containedRule3];
      const myPackage = new Package();
      myPackage.add(instance1);
      myPackage.add(instance2);
      myPackage.add(instance3);
      myPackage.add(resource);
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
      const expectedResource = new ExportableResource('Toast');
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'contained[0]';
      expectedRule1.isInstance = true;
      expectedRule1.value = 'AmazingThings-of-CodeSystem'; // This name did not get changed
      const expectedRule2 = new ExportableCaretValueRule('');
      expectedRule2.caretPath = 'contained[1]';
      expectedRule2.isInstance = true;
      expectedRule2.value = 'AmazingThings-of-ValueSet'; // This name did not get changed
      const expectedRule3 = new ExportableCaretValueRule('');
      expectedRule3.caretPath = 'contained[2]';
      expectedRule3.isInstance = true;
      expectedRule3.value = 'OtherAmazingThings'; // This name was changed
      expectedResource.rules = [expectedRule1, expectedRule2, expectedRule3];
      expect(myPackage.instances).toEqual([
        expectedInstance1,
        expectedInstance2,
        expectedInstance3
      ]);
      expect(myPackage.resources).toEqual([expectedResource]);
    });

    it('should update inlined contained rules in a code system when the contained instance name changes', () => {
      const instance1 = new ExportableInstance('AmazingThings');
      instance1.instanceOf = 'CodeSystem';
      instance1.name = 'AmazingThings-of-CodeSystem';
      const instance2 = new ExportableInstance('AmazingThings');
      instance2.instanceOf = 'ValueSet';
      instance2.name = 'AmazingThings-of-ValueSet';
      const instance3 = new ExportableInstance('OtherAmazingThings');
      instance3.instanceOf = 'ValueSet';
      instance3.name = 'OtherAmazingThings-of-ValueSet';
      const codeSystem = new ExportableCodeSystem('MyCodeSystem');
      const containedRule1 = new ExportableCaretValueRule('');
      containedRule1.caretPath = 'contained[0]';
      containedRule1.isInstance = true;
      containedRule1.value = 'AmazingThings-of-CodeSystem';
      const containedRule2 = new ExportableCaretValueRule('');
      containedRule2.caretPath = 'contained[1]';
      containedRule2.isInstance = true;
      containedRule2.value = 'AmazingThings-of-ValueSet';
      const containedRule3 = new ExportableCaretValueRule('');
      containedRule3.caretPath = 'contained[2]';
      containedRule3.isInstance = true;
      containedRule3.value = 'OtherAmazingThings-of-ValueSet';
      codeSystem.rules = [containedRule1, containedRule2, containedRule3];
      const myPackage = new Package();
      myPackage.add(instance1);
      myPackage.add(instance2);
      myPackage.add(instance3);
      myPackage.add(codeSystem);
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
      const expectedCodeSystem = new ExportableCodeSystem('MyCodeSystem');
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'contained[0]';
      expectedRule1.isInstance = true;
      expectedRule1.value = 'AmazingThings-of-CodeSystem'; // This name did not get changed
      const expectedRule2 = new ExportableCaretValueRule('');
      expectedRule2.caretPath = 'contained[1]';
      expectedRule2.isInstance = true;
      expectedRule2.value = 'AmazingThings-of-ValueSet'; // This name did not get changed
      const expectedRule3 = new ExportableCaretValueRule('');
      expectedRule3.caretPath = 'contained[2]';
      expectedRule3.isInstance = true;
      expectedRule3.value = 'OtherAmazingThings'; // This name was changed
      expectedCodeSystem.rules = [expectedRule1, expectedRule2, expectedRule3];
      expect(myPackage.instances).toEqual([
        expectedInstance1,
        expectedInstance2,
        expectedInstance3
      ]);
      expect(myPackage.codeSystems).toEqual([expectedCodeSystem]);
    });

    it('should update inlined contained rules in a value set when the contained instance name changes', () => {
      const instance1 = new ExportableInstance('AmazingThings');
      instance1.instanceOf = 'CodeSystem';
      instance1.name = 'AmazingThings-of-CodeSystem';
      const instance2 = new ExportableInstance('AmazingThings');
      instance2.instanceOf = 'ValueSet';
      instance2.name = 'AmazingThings-of-ValueSet';
      const instance3 = new ExportableInstance('OtherAmazingThings');
      instance3.instanceOf = 'ValueSet';
      instance3.name = 'OtherAmazingThings-of-ValueSet';
      const valueSet = new ExportableValueSet('MyValueSet');
      const containedRule1 = new ExportableCaretValueRule('');
      containedRule1.caretPath = 'contained[0]';
      containedRule1.isInstance = true;
      containedRule1.value = 'AmazingThings-of-CodeSystem';
      const containedRule2 = new ExportableCaretValueRule('');
      containedRule2.caretPath = 'contained[1]';
      containedRule2.isInstance = true;
      containedRule2.value = 'AmazingThings-of-ValueSet';
      const containedRule3 = new ExportableCaretValueRule('');
      containedRule3.caretPath = 'contained[2]';
      containedRule3.isInstance = true;
      containedRule3.value = 'OtherAmazingThings-of-ValueSet';
      valueSet.rules = [containedRule1, containedRule2, containedRule3];
      const myPackage = new Package();
      myPackage.add(instance1);
      myPackage.add(instance2);
      myPackage.add(instance3);
      myPackage.add(valueSet);
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
      const expectedValueSet = new ExportableValueSet('MyValueSet');
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'contained[0]';
      expectedRule1.isInstance = true;
      expectedRule1.value = 'AmazingThings-of-CodeSystem'; // This name did not get changed
      const expectedRule2 = new ExportableCaretValueRule('');
      expectedRule2.caretPath = 'contained[1]';
      expectedRule2.isInstance = true;
      expectedRule2.value = 'AmazingThings-of-ValueSet'; // This name did not get changed
      const expectedRule3 = new ExportableCaretValueRule('');
      expectedRule3.caretPath = 'contained[2]';
      expectedRule3.isInstance = true;
      expectedRule3.value = 'OtherAmazingThings'; // This name was changed
      expectedValueSet.rules = [expectedRule1, expectedRule2, expectedRule3];
      expect(myPackage.instances).toEqual([
        expectedInstance1,
        expectedInstance2,
        expectedInstance3
      ]);
      expect(myPackage.valueSets).toEqual([expectedValueSet]);
    });

    it('should still rename instances when there is a different instance with the same id but it is inline only', () => {
      const instance1 = new ExportableInstance('AmazingThings');
      instance1.instanceOf = 'CodeSystem';
      instance1.name = 'AmazingThings-of-CodeSystem';
      const profile = new ExportableProfile('MyObservationProfile');
      profile.parent = 'Observation';
      const profileContainedRule1 = new ExportableCaretValueRule('');
      profileContainedRule1.caretPath = 'contained[0].resourceType';
      profileContainedRule1.value = 'CodeSystem';
      const profileContainedRule2 = new ExportableCaretValueRule('');
      profileContainedRule2.caretPath = 'contained[0].id';
      profileContainedRule2.value = 'AmazingThings'; // Same id as instance1
      const profileContainedRule3 = new ExportableCaretValueRule('');
      profileContainedRule3.caretPath = 'contained[0].title';
      profileContainedRule3.value = 'Amazing Things'; // The title makes it different than the standalone
      profile.rules = [profileContainedRule1, profileContainedRule2, profileContainedRule3];
      const myPackage = new Package();
      myPackage.add(instance1);
      myPackage.add(profile);

      // Run the ConstructInlineInstanceOptimizer to convert the inline CodeSystem to an Instance
      ConstructInlineInstanceOptimizer.optimize(myPackage);

      // Run the SimplifyInstanceNameOptimizer
      optimizer.optimize(myPackage);

      // The standalone instance instance1 should have been renamed
      const expectedInstance1 = new ExportableInstance('AmazingThings');
      expectedInstance1.instanceOf = 'CodeSystem';
      expectedInstance1.name = 'AmazingThings';
      // A new inline instance should have been created with the right name/id
      const expectedInstance2 = new ExportableInstance(
        'Inline-Instance-for-MyObservationProfile-1'
      );
      expectedInstance2.instanceOf = 'CodeSystem';
      expectedInstance2.name = 'Inline-Instance-for-MyObservationProfile-1';
      expectedInstance2.usage = 'Inline';
      const inlineInstanceIdRule = new ExportableAssignmentRule('id');
      inlineInstanceIdRule.value = 'AmazingThings';
      const inlineInstanceTitleRule = new ExportableAssignmentRule('title');
      inlineInstanceTitleRule.value = 'Amazing Things';
      expectedInstance2.rules = [inlineInstanceIdRule, inlineInstanceTitleRule];
      // The profile should point to the inline instance
      const expectedProfile = new ExportableProfile('MyObservationProfile');
      expectedProfile.parent = 'Observation';
      const expectedProfileRule1 = new ExportableCaretValueRule('');
      expectedProfileRule1.caretPath = 'contained[0]';
      expectedProfileRule1.isInstance = true;
      expectedProfileRule1.value = 'Inline-Instance-for-MyObservationProfile-1';
      expectedProfile.rules = [expectedProfileRule1];
      expect(myPackage.instances).toEqual([expectedInstance1, expectedInstance2]);
      expect(myPackage.profiles).toEqual([expectedProfile]);
    });
  });
});
