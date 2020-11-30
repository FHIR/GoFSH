import { cloneDeep } from 'lodash';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableExtension,
  ExportableInstance,
  ExportableProfile
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/ConstructInlineInstanceOptimizer';
import { assertExportableInstance } from '../../helpers/asserts';

describe('optimizer', () => {
  describe('#construct_inline_instance', () => {
    describe('Instances', () => {
      let containedResourceType1: ExportableAssignmentRule;
      let containedId1: ExportableAssignmentRule;
      let containedResourceType2: ExportableAssignmentRule;
      let containedId2: ExportableAssignmentRule;
      let bundleResourceType: ExportableAssignmentRule;
      let bundleId: ExportableAssignmentRule;
      let instance: ExportableInstance;

      beforeEach(() => {
        containedResourceType1 = new ExportableAssignmentRule('contained[0].resourceType');
        containedResourceType1.value = 'Observation';
        containedId1 = new ExportableAssignmentRule('contained[0].id');
        containedId1.value = 'Bar';

        containedResourceType2 = new ExportableAssignmentRule('contained[1].resourceType');
        containedResourceType2.value = 'ValueSet';
        containedId2 = new ExportableAssignmentRule('contained[1].id');
        containedId2.value = 'Baz';

        bundleResourceType = new ExportableAssignmentRule('entry[0].resource.resourceType');
        bundleResourceType.value = 'Organization';
        bundleId = new ExportableAssignmentRule('entry[0].resource.id');
        bundleId.value = 'Bam';

        instance = new ExportableInstance('Foo');
        instance.instanceOf = 'Patient';
      });

      it('should have appropriate metadata', () => {
        expect(optimizer.name).toBe('construct_inline_instance');
        expect(optimizer.description).toBeDefined();
        expect(optimizer.runBefore).toBeUndefined();
        expect(optimizer.runAfter).toBeUndefined();
      });

      it('should create inline instances from contained resources', () => {
        instance.rules = [
          containedResourceType1,
          containedId1,
          containedResourceType2,
          containedId2
        ];
        const myPackage = new Package();
        myPackage.add(instance);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(3);
        assertExportableInstance(
          myPackage.instances[1],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          []
        );
        assertExportableInstance(
          myPackage.instances[2],
          'Baz',
          'ValueSet',
          'Inline',
          undefined,
          undefined,
          []
        );

        const inlineInstanceRule1 = new ExportableAssignmentRule('contained[0]');
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        const inlineInstanceRule2 = new ExportableAssignmentRule('contained[1]');
        inlineInstanceRule2.value = 'Baz';
        inlineInstanceRule2.isInstance = true;
        expect(instance.rules).toEqual([inlineInstanceRule1, inlineInstanceRule2]);
      });

      it('should create inline instances from contained and bundle resources', () => {
        instance.rules = [containedResourceType1, containedId1, bundleResourceType, bundleId];
        const myPackage = new Package();
        myPackage.add(instance);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(3);
        assertExportableInstance(
          myPackage.instances[1],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          []
        );
        assertExportableInstance(
          myPackage.instances[2],
          'Bam',
          'Organization',
          'Inline',
          undefined,
          undefined,
          []
        );

        const inlineInstanceRule1 = new ExportableAssignmentRule('contained[0]');
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        const inlineInstanceRule2 = new ExportableAssignmentRule('entry[0].resource');
        inlineInstanceRule2.value = 'Bam';
        inlineInstanceRule2.isInstance = true;
        expect(instance.rules).toEqual([inlineInstanceRule1, inlineInstanceRule2]);
      });

      it('should create an inline instance from a contained resource with non-numeric paths', () => {
        containedResourceType1.path = 'contained.resourceType';
        containedId1.path = 'contained.id';
        instance.rules = [containedResourceType1, containedId1];
        const myPackage = new Package();
        myPackage.add(instance);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(2);
        assertExportableInstance(
          myPackage.instances[1],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          []
        );

        const inlineInstanceRule1 = new ExportableAssignmentRule('contained');
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(instance.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create inline instances from contained resources with no id', () => {
        instance.rules = [containedResourceType1, containedResourceType2];
        const myPackage = new Package();
        myPackage.add(instance);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(3);
        assertExportableInstance(
          myPackage.instances[1],
          'Inline-Instance-for-Foo-1',
          'Observation',
          'Inline',
          undefined,
          undefined,
          []
        );
        assertExportableInstance(
          myPackage.instances[2],
          'Inline-Instance-for-Foo-2',
          'ValueSet',
          'Inline',
          undefined,
          undefined,
          []
        );

        const inlineInstanceRule1 = new ExportableAssignmentRule('contained[0]');
        inlineInstanceRule1.value = 'Inline-Instance-for-Foo-1';
        inlineInstanceRule1.isInstance = true;
        const inlineInstanceRule2 = new ExportableAssignmentRule('contained[1]');
        inlineInstanceRule2.value = 'Inline-Instance-for-Foo-2';
        inlineInstanceRule2.isInstance = true;
        expect(instance.rules).toEqual([inlineInstanceRule1, inlineInstanceRule2]);
      });

      it('should create inline instances from contained resources with numerical ids', () => {
        containedId1.value = '123';
        containedId2.value = '456';
        instance.rules = [
          containedResourceType1,
          containedId1,
          containedResourceType2,
          containedId2
        ];
        const myPackage = new Package();
        myPackage.add(instance);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(3);
        const expectedRule1 = cloneDeep(containedId1);
        expectedRule1.path = 'id';
        assertExportableInstance(
          myPackage.instances[1],
          'Inline-Instance-for-Foo-1',
          'Observation',
          'Inline',
          undefined,
          undefined,
          [expectedRule1]
        );

        const expectedRule2 = cloneDeep(containedId2);
        expectedRule2.path = 'id';
        assertExportableInstance(
          myPackage.instances[2],
          'Inline-Instance-for-Foo-2',
          'ValueSet',
          'Inline',
          undefined,
          undefined,
          [expectedRule2]
        );

        const inlineInstanceRule1 = new ExportableAssignmentRule('contained[0]');
        inlineInstanceRule1.value = 'Inline-Instance-for-Foo-1';
        inlineInstanceRule1.isInstance = true;
        const inlineInstanceRule2 = new ExportableAssignmentRule('contained[1]');
        inlineInstanceRule2.value = 'Inline-Instance-for-Foo-2';
        inlineInstanceRule2.isInstance = true;
        expect(instance.rules).toEqual([inlineInstanceRule1, inlineInstanceRule2]);
      });

      it('should create inline instances from contained resources with repeated ids', () => {
        const someInstance = new ExportableInstance('repeated-id');
        containedId1.value = 'repeated-id';
        instance.rules = [containedResourceType1, containedId1];
        const myPackage = new Package();
        myPackage.add(someInstance);
        myPackage.add(instance);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(3);
        const expectedRule = cloneDeep(containedId1);
        expectedRule.path = 'id';
        assertExportableInstance(
          myPackage.instances[2],
          'Inline-Instance-for-Foo-1',
          'Observation',
          'Inline',
          undefined,
          undefined,
          [expectedRule]
        );

        const inlineInstanceRule1 = new ExportableAssignmentRule('contained[0]');
        inlineInstanceRule1.value = 'Inline-Instance-for-Foo-1';
        inlineInstanceRule1.isInstance = true;
        expect(instance.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create an inline instance from a contained resource with additional rules', () => {
        const containedString = new ExportableAssignmentRule('contained[0].valueString');
        containedString.value = 'string value';
        instance.rules = [containedResourceType1, containedId1, containedString];
        const myPackage = new Package();
        myPackage.add(instance);
        optimizer.optimize(myPackage);

        const expectedRule = cloneDeep(containedString);
        expectedRule.path = 'valueString';
        expect(myPackage.instances).toHaveLength(2);
        assertExportableInstance(
          myPackage.instances[1],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          [expectedRule]
        );

        const inlineInstanceRule1 = new ExportableAssignmentRule('contained[0]');
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(instance.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create an inline instance from a contained resource and ignore other rules', () => {
        const containedString = new ExportableAssignmentRule('contained[0].valueString');
        containedString.value = 'string value';

        const nonContainedRule = new ExportableAssignmentRule('name.family');
        nonContainedRule.value = 'Boo';

        instance.rules = [containedResourceType1, containedId1, containedString, nonContainedRule];
        const myPackage = new Package();
        myPackage.add(instance);
        optimizer.optimize(myPackage);

        const expectedRule = cloneDeep(containedString);
        expectedRule.path = 'valueString';
        expect(myPackage.instances).toHaveLength(2);
        assertExportableInstance(
          myPackage.instances[1],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          [expectedRule]
        );

        const inlineInstanceRule1 = new ExportableAssignmentRule('contained[0]');
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(instance.rules).toEqual([inlineInstanceRule1, nonContainedRule]);
      });

      it('should create a profiled inline instance from a contained resource', () => {
        const containedProfile = new ExportableAssignmentRule('contained[0].meta.profile[0]');
        containedProfile.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        instance.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(instance);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(2);
        assertExportableInstance(
          myPackage.instances[1],
          'Bar',
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab',
          'Inline',
          undefined,
          undefined,
          []
        );

        const inlineInstanceRule1 = new ExportableAssignmentRule('contained[0]');
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(instance.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create a profiled inline instance from a contained resource with non-numeric path', () => {
        const containedProfile = new ExportableAssignmentRule('contained[0].meta.profile');
        containedProfile.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        instance.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(instance);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(2);
        assertExportableInstance(
          myPackage.instances[1],
          'Bar',
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab',
          'Inline',
          undefined,
          undefined,
          []
        );

        const inlineInstanceRule1 = new ExportableAssignmentRule('contained[0]');
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(instance.rules).toEqual([inlineInstanceRule1]);
      });
    });

    describe('StructureDefinitions', () => {
      let containedResourceType1: ExportableCaretValueRule;
      let containedId1: ExportableCaretValueRule;
      let containedResourceType2: ExportableCaretValueRule;
      let containedId2: ExportableCaretValueRule;
      let profile: ExportableProfile;
      let extension: ExportableExtension;

      beforeEach(() => {
        containedResourceType1 = new ExportableCaretValueRule('');
        containedResourceType1.caretPath = 'contained[0].resourceType';
        containedResourceType1.value = 'Observation';
        containedId1 = new ExportableCaretValueRule('');
        containedId1.caretPath = 'contained[0].id';
        containedId1.value = 'Bar';

        containedResourceType2 = new ExportableCaretValueRule('');
        containedResourceType2.caretPath = 'contained[1].resourceType';
        containedResourceType2.value = 'ValueSet';
        containedId2 = new ExportableCaretValueRule('');
        containedId2.caretPath = 'contained[1].id';
        containedId2.value = 'Baz';

        profile = new ExportableProfile('Foo');
        profile.parent = 'Patient';

        extension = new ExportableExtension('FooExtension');
      });

      it('should have appropriate metadata', () => {
        expect(optimizer.name).toBe('construct_inline_instance');
        expect(optimizer.description).toBeDefined();
        expect(optimizer.runBefore).toBeUndefined();
        expect(optimizer.runAfter).toBeUndefined();
      });

      it('should create inline instances from contained resources on a profile', () => {
        profile.rules = [
          containedResourceType1,
          containedId1,
          containedResourceType2,
          containedId2
        ];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(2);
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          []
        );
        assertExportableInstance(
          myPackage.instances[1],
          'Baz',
          'ValueSet',
          'Inline',
          undefined,
          undefined,
          []
        );

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        const inlineInstanceRule2 = new ExportableCaretValueRule('');
        inlineInstanceRule2.caretPath = 'contained[1]';
        inlineInstanceRule2.value = 'Baz';
        inlineInstanceRule2.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1, inlineInstanceRule2]);
      });

      it('should create inline instances from contained resources on an extension', () => {
        extension.rules = [
          containedResourceType1,
          containedId1,
          containedResourceType2,
          containedId2
        ];
        const myPackage = new Package();
        myPackage.add(extension);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(2);
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          []
        );
        assertExportableInstance(
          myPackage.instances[1],
          'Baz',
          'ValueSet',
          'Inline',
          undefined,
          undefined,
          []
        );

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        const inlineInstanceRule2 = new ExportableCaretValueRule('');
        inlineInstanceRule2.caretPath = 'contained[1]';
        inlineInstanceRule2.value = 'Baz';
        inlineInstanceRule2.isInstance = true;
        expect(extension.rules).toEqual([inlineInstanceRule1, inlineInstanceRule2]);
      });

      it('should create an inline instance from a contained resource with non-numeric paths', () => {
        containedResourceType1.caretPath = 'contained.resourceType';
        containedId1.caretPath = 'contained.id';
        profile.rules = [containedResourceType1, containedId1];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(1);
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          []
        );

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create inline instances from contained resources with no id', () => {
        profile.rules = [containedResourceType1, containedResourceType2];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(2);
        assertExportableInstance(
          myPackage.instances[0],
          'Inline-Instance-for-Foo-1',
          'Observation',
          'Inline',
          undefined,
          undefined,
          []
        );
        assertExportableInstance(
          myPackage.instances[1],
          'Inline-Instance-for-Foo-2',
          'ValueSet',
          'Inline',
          undefined,
          undefined,
          []
        );

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Inline-Instance-for-Foo-1';
        inlineInstanceRule1.isInstance = true;
        const inlineInstanceRule2 = new ExportableCaretValueRule('');
        inlineInstanceRule2.caretPath = 'contained[1]';
        inlineInstanceRule2.value = 'Inline-Instance-for-Foo-2';
        inlineInstanceRule2.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1, inlineInstanceRule2]);
      });

      it('should create an inline instance from a contained resource with additional rules', () => {
        const containedString = new ExportableCaretValueRule('');
        containedString.caretPath = 'contained[0].valueString';
        containedString.value = 'string value';
        profile.rules = [containedResourceType1, containedId1, containedString];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(1);
        const expectedRule = new ExportableAssignmentRule('valueString');
        expectedRule.value = 'string value';
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          [expectedRule]
        );

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create an inline instance from a contained resource and ignore other rules', () => {
        const containedString = new ExportableCaretValueRule('');
        containedString.caretPath = 'contained[0].valueString';
        containedString.value = 'string value';

        const nonContainedRule = new ExportableCaretValueRule('');
        nonContainedRule.caretPath = 'name.family';
        nonContainedRule.value = 'Boo';

        profile.rules = [containedResourceType1, containedId1, containedString, nonContainedRule];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage);

        const expectedRule = new ExportableAssignmentRule('valueString');
        expectedRule.value = 'string value';
        expect(myPackage.instances).toHaveLength(1);
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          [expectedRule]
        );

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1, nonContainedRule]);
      });

      it('should create a profiled inline instance from a contained resource', () => {
        const containedProfile = new ExportableCaretValueRule('');
        containedProfile.caretPath = 'contained[0].meta.profile[0]';
        containedProfile.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        profile.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(1);
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab',
          'Inline',
          undefined,
          undefined,
          []
        );

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create a profiled inline instance from a contained resource with non-numeric path', () => {
        const containedProfile = new ExportableCaretValueRule('');
        containedProfile.caretPath = 'contained[0].meta.profile';
        containedProfile.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        profile.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage);

        expect(myPackage.instances).toHaveLength(1);
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab',
          'Inline',
          undefined,
          undefined,
          []
        );

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1]);
      });
    });
  });
});
