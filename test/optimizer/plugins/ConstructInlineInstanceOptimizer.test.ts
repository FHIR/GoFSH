import { cloneDeep } from 'lodash';
import { fshtypes } from 'fsh-sushi';
import { loggerSpy } from '../../helpers/loggerSpy';
import { Package } from '../../../src/processor';
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
import optimizer from '../../../src/optimizer/plugins/ConstructInlineInstanceOptimizer';
import {
  assertExportableInstance,
  assertExportableInstanceWithDifferentName
} from '../../helpers/asserts';
import RemoveGeneratedTextRulesOptimizer from '../../../src/optimizer/plugins/RemoveGeneratedTextRulesOptimizer';
import ResolveInstanceOfURLsOptimizer from '../../../src/optimizer/plugins/ResolveInstanceOfURLsOptimizer';
import AddReferenceKeywordOptimizer from '../../../src/optimizer/plugins/AddReferenceKeywordOptimizer';
import SimplifyInstanceNameOptimizer from '../../../src/optimizer/plugins/SimplifyInstanceNameOptimizer';
import { MasterFisher } from '../../../src/utils';
import { loadTestDefinitions, stockLake } from '../../helpers';
import { CombineCodingAndQuantityValuesOptimizer } from '../../../src/optimizer/plugins';

describe('optimizer', () => {
  describe('#construct_inline_instance', () => {
    let fisher: MasterFisher;

    beforeAll(async () => {
      const defs = await loadTestDefinitions();
      const lake = await stockLake();
      fisher = new MasterFisher(lake, defs);
    });

    beforeEach(() => {
      loggerSpy.reset();
    });

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
        expect(optimizer.runBefore).toEqual([
          RemoveGeneratedTextRulesOptimizer.name,
          ResolveInstanceOfURLsOptimizer.name,
          AddReferenceKeywordOptimizer.name,
          SimplifyInstanceNameOptimizer.name,
          CombineCodingAndQuantityValuesOptimizer.name
        ]);
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
        optimizer.optimize(myPackage, fisher);

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
        optimizer.optimize(myPackage, fisher);

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
        optimizer.optimize(myPackage, fisher);

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
        optimizer.optimize(myPackage, fisher);

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
        containedId1.value = '0123';
        containedId2.value = '456';
        instance.rules = [
          containedResourceType1,
          containedId1,
          containedResourceType2,
          containedId2
        ];
        const myPackage = new Package();
        myPackage.add(instance);
        optimizer.optimize(myPackage, fisher);

        expect(myPackage.instances).toHaveLength(3);
        assertExportableInstanceWithDifferentName(
          myPackage.instances[1],
          '0123',
          '0123',
          'Observation',
          'Inline',
          undefined,
          undefined,
          []
        );

        assertExportableInstanceWithDifferentName(
          myPackage.instances[2],
          '456',
          '456',
          'ValueSet',
          'Inline',
          undefined,
          undefined,
          []
        );

        const inlineInstanceRule1 = new ExportableAssignmentRule('contained[0]');
        inlineInstanceRule1.value = '0123';
        inlineInstanceRule1.isInstance = true;
        const inlineInstanceRule2 = new ExportableAssignmentRule('contained[1]');
        inlineInstanceRule2.value = '456';
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
        optimizer.optimize(myPackage, fisher);

        expect(myPackage.instances).toHaveLength(3);
        const expectedRule = cloneDeep(containedId1);
        expectedRule.path = 'id';
        assertExportableInstanceWithDifferentName(
          myPackage.instances[2],
          'Inline-Instance-for-Foo-1',
          'repeated-id',
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
        optimizer.optimize(myPackage, fisher);

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
        optimizer.optimize(myPackage, fisher);

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
        containedProfile.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        instance.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(instance);
        optimizer.optimize(myPackage, fisher);

        expect(myPackage.instances).toHaveLength(2);
        assertExportableInstance(
          myPackage.instances[1],
          'Bar',
          'http://hl7.org/fhir/StructureDefinition/vitalsigns',
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
        containedProfile.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        instance.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(instance);
        optimizer.optimize(myPackage, fisher);

        expect(myPackage.instances).toHaveLength(2);
        assertExportableInstance(
          myPackage.instances[1],
          'Bar',
          'http://hl7.org/fhir/StructureDefinition/vitalsigns',
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

      it('should use an existing instance if creating a new inline instance would duplicate it', () => {
        const containedString = new ExportableAssignmentRule('contained[0].valueString');
        containedString.value = 'string value';
        const containedStatusRule = new ExportableAssignmentRule('contained[0].text.status');
        containedStatusRule.value = new fshtypes.FshCode('generated');
        const containedDivRule = new ExportableAssignmentRule('contained[0].text.div');
        containedDivRule.value = 'some text';
        instance.rules = [
          containedResourceType1,
          containedId1,
          containedString,
          containedStatusRule,
          containedDivRule
        ];
        const myPackage = new Package();
        myPackage.add(instance);

        const existingInstance = new ExportableInstance('Bar');
        existingInstance.instanceOf = 'Observation';
        const stringRule = new ExportableAssignmentRule('valueString');
        stringRule.value = 'string value';
        const statusRule = new ExportableAssignmentRule('text.status');
        statusRule.value = new fshtypes.FshCode('generated');
        const divRule = new ExportableAssignmentRule('text.div');
        divRule.value = 'other text';
        existingInstance.rules = [stringRule, statusRule, divRule];
        myPackage.add(existingInstance);
        optimizer.optimize(myPackage, fisher);

        const expectedRule = cloneDeep(containedString);
        expectedRule.path = 'valueString';
        expect(myPackage.instances).toHaveLength(2);
        assertExportableInstance(
          myPackage.instances[1],
          existingInstance.id,
          existingInstance.instanceOf,
          existingInstance.usage,
          existingInstance.title,
          existingInstance.description,
          existingInstance.rules
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
      let logical: ExportableLogical;
      let resource: ExportableResource;

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

        logical = new ExportableLogical('Pretzel');

        resource = new ExportableResource('Toast');
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
        optimizer.optimize(myPackage, fisher);

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
        optimizer.optimize(myPackage, fisher);

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

      it('should create inline instances from contained resources on a logical', () => {
        logical.rules = [
          containedResourceType1,
          containedId1,
          containedResourceType2,
          containedId2
        ];
        const myPackage = new Package();
        myPackage.add(logical);
        optimizer.optimize(myPackage, fisher);

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
        expect(logical.rules).toEqual([inlineInstanceRule1, inlineInstanceRule2]);
      });

      it('should create inline instances from contained resources on a resource', () => {
        resource.rules = [
          containedResourceType1,
          containedId1,
          containedResourceType2,
          containedId2
        ];
        const myPackage = new Package();
        myPackage.add(resource);
        optimizer.optimize(myPackage, fisher);

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
        expect(resource.rules).toEqual([inlineInstanceRule1, inlineInstanceRule2]);
      });

      it('should create an inline instance from a contained resource with non-numeric paths', () => {
        containedResourceType1.caretPath = 'contained.resourceType';
        containedId1.caretPath = 'contained.id';
        profile.rules = [containedResourceType1, containedId1];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage, fisher);

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
        optimizer.optimize(myPackage, fisher);

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
        optimizer.optimize(myPackage, fisher);

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
        optimizer.optimize(myPackage, fisher);

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
        containedProfile.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        profile.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage, fisher);

        expect(myPackage.instances).toHaveLength(1);
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'http://hl7.org/fhir/StructureDefinition/vitalsigns',
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

      it('should create a profiled inline instance from a contained resource when the metaProfile option is only-one', () => {
        const containedProfile = new ExportableCaretValueRule('');
        containedProfile.caretPath = 'contained[0].meta.profile[0]';
        containedProfile.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        profile.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage, fisher, { metaProfile: 'only-one' });

        expect(myPackage.instances).toHaveLength(1);
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'http://hl7.org/fhir/StructureDefinition/vitalsigns',
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

      it('should create a profiled inline instance from a contained resource when the metaProfile option is first', () => {
        const containedProfile = new ExportableCaretValueRule('');
        containedProfile.caretPath = 'contained[0].meta.profile[0]';
        containedProfile.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        profile.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage, fisher, { metaProfile: 'first' });

        expect(myPackage.instances).toHaveLength(1);
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'http://hl7.org/fhir/StructureDefinition/vitalsigns',
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

      it('should create a non-profiled inline instance from a contained resource when the metaProfile option is none', () => {
        const containedProfile = new ExportableCaretValueRule('');
        containedProfile.caretPath = 'contained[0].meta.profile[0]';
        containedProfile.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        profile.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage, fisher, { metaProfile: 'none' });

        expect(myPackage.instances).toHaveLength(1);
        const profileRule1 = new ExportableAssignmentRule('meta.profile[0]');
        profileRule1.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          [profileRule1]
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
        containedProfile.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        profile.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage, fisher);

        expect(myPackage.instances).toHaveLength(1);
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'http://hl7.org/fhir/StructureDefinition/vitalsigns',
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

      it('should create an inline instance from a contained resource with multiple profiles', () => {
        const containedProfile1 = new ExportableCaretValueRule('');
        containedProfile1.caretPath = 'contained[0].meta.profile[0]';
        containedProfile1.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        const containedProfile2 = new ExportableCaretValueRule('');
        containedProfile2.caretPath = 'contained[0].meta.profile[1]';
        containedProfile2.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        profile.rules = [
          containedResourceType1,
          containedId1,
          containedProfile1,
          containedProfile2
        ];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage, fisher);

        expect(myPackage.instances).toHaveLength(1);
        const profileRule1 = new ExportableAssignmentRule('meta.profile[0]');
        profileRule1.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        const profileRule2 = new ExportableAssignmentRule('meta.profile[1]');
        profileRule2.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          [profileRule1, profileRule2]
        );
        // Even though the second entry in meta.profile won't resolve, we don't try to resolve them when there is more than one.
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create an inline instance from a contained resource with multiple profiles when the metaProfile option is only-one', () => {
        const containedProfile1 = new ExportableCaretValueRule('');
        containedProfile1.caretPath = 'contained[0].meta.profile[0]';
        containedProfile1.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        const containedProfile2 = new ExportableCaretValueRule('');
        containedProfile2.caretPath = 'contained[0].meta.profile[1]';
        containedProfile2.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        profile.rules = [
          containedResourceType1,
          containedId1,
          containedProfile1,
          containedProfile2
        ];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage, fisher, { metaProfile: 'only-one' });

        expect(myPackage.instances).toHaveLength(1);
        const profileRule1 = new ExportableAssignmentRule('meta.profile[0]');
        profileRule1.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        const profileRule2 = new ExportableAssignmentRule('meta.profile[1]');
        profileRule2.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          [profileRule1, profileRule2]
        );
        // Even though the second entry in meta.profile won't resolve, we don't try to resolve them when there is more than one.
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create a profiled inline instance from a contained resource with multiple profiles when the metaProfile option is first', () => {
        const containedProfile1 = new ExportableCaretValueRule('');
        containedProfile1.caretPath = 'contained[0].meta.profile[0]';
        containedProfile1.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        const containedProfile2 = new ExportableCaretValueRule('');
        containedProfile2.caretPath = 'contained[0].meta.profile[1]';
        containedProfile2.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        profile.rules = [
          containedResourceType1,
          containedId1,
          containedProfile1,
          containedProfile2
        ];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage, fisher, { metaProfile: 'first' });

        expect(myPackage.instances).toHaveLength(1);
        const profileRule1 = new ExportableAssignmentRule('meta.profile[0]');
        profileRule1.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'http://hl7.org/fhir/StructureDefinition/vitalsigns',
          'Inline',
          undefined,
          undefined,
          [profileRule1]
        );
        // Even though the second entry in meta.profile won't resolve, we don't try to resolve them when there is more than one.
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create an inline instance from a contained resource with multiple profiles when the metaProfile option is none', () => {
        const containedProfile1 = new ExportableCaretValueRule('');
        containedProfile1.caretPath = 'contained[0].meta.profile[0]';
        containedProfile1.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        const containedProfile2 = new ExportableCaretValueRule('');
        containedProfile2.caretPath = 'contained[0].meta.profile[1]';
        containedProfile2.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        profile.rules = [
          containedResourceType1,
          containedId1,
          containedProfile1,
          containedProfile2
        ];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage, fisher, { metaProfile: 'none' });

        expect(myPackage.instances).toHaveLength(1);
        const profileRule1 = new ExportableAssignmentRule('meta.profile[0]');
        profileRule1.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        const profileRule2 = new ExportableAssignmentRule('meta.profile[1]');
        profileRule2.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          [profileRule1, profileRule2]
        );
        // Even though the second entry in meta.profile won't resolve, we don't try to resolve them when there is more than one.
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create an inline instance from a contained resource when the profile on the instance is not available', () => {
        const containedProfile = new ExportableCaretValueRule('');
        containedProfile.caretPath = 'contained[0].meta.profile[0]';
        containedProfile.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        profile.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage, fisher);

        expect(myPackage.instances).toHaveLength(1);
        const profileRule = new ExportableAssignmentRule('meta.profile[0]');
        profileRule.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          [profileRule]
        );
        expect(loggerSpy.getLastMessage('warn')).toMatch(/InstanceOf definition not found for/s);

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create an inline instance from a contained resource when the metaProfile option is only-one and the profile on the instance is not available', () => {
        const containedProfile = new ExportableCaretValueRule('');
        containedProfile.caretPath = 'contained[0].meta.profile[0]';
        containedProfile.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        profile.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage, fisher, { metaProfile: 'only-one' });

        expect(myPackage.instances).toHaveLength(1);
        const profileRule = new ExportableAssignmentRule('meta.profile[0]');
        profileRule.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          [profileRule]
        );
        expect(loggerSpy.getLastMessage('warn')).toMatch(/InstanceOf definition not found for/s);

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create an inline instance from a contained resource when the metaProfile option is first and the profile on the instance is not available', () => {
        const containedProfile = new ExportableCaretValueRule('');
        containedProfile.caretPath = 'contained[0].meta.profile[0]';
        containedProfile.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        profile.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage, fisher, { metaProfile: 'first' });

        expect(myPackage.instances).toHaveLength(1);
        const profileRule = new ExportableAssignmentRule('meta.profile[0]');
        profileRule.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          [profileRule]
        );
        expect(loggerSpy.getLastMessage('warn')).toMatch(/InstanceOf definition not found for/s);

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create an inline instance from a contained resource when the metaProfile option is none and the profile on the instance is not available', () => {
        const containedProfile = new ExportableCaretValueRule('');
        containedProfile.caretPath = 'contained[0].meta.profile[0]';
        containedProfile.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        profile.rules = [containedResourceType1, containedId1, containedProfile];
        const myPackage = new Package();
        myPackage.add(profile);
        optimizer.optimize(myPackage, fisher, { metaProfile: 'none' });

        expect(myPackage.instances).toHaveLength(1);
        const profileRule = new ExportableAssignmentRule('meta.profile[0]');
        profileRule.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'Observation',
          'Inline',
          undefined,
          undefined,
          [profileRule]
        );
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(profile.rules).toEqual([inlineInstanceRule1]);
      });
    });

    describe('ValueSets', () => {
      // All FSH types that use Caret rules work the same in this optimizer,
      // so a limited subset of the tests from StructureDefinitions are used here.
      let containedResourceType1: ExportableCaretValueRule;
      let containedId1: ExportableCaretValueRule;
      let valueSet: ExportableValueSet;

      beforeEach(() => {
        containedResourceType1 = new ExportableCaretValueRule('');
        containedResourceType1.caretPath = 'contained[0].resourceType';
        containedResourceType1.value = 'Observation';
        containedId1 = new ExportableCaretValueRule('');
        containedId1.caretPath = 'contained[0].id';
        containedId1.value = 'Bar';

        valueSet = new ExportableValueSet('MyValueSet');
      });

      it('should create an inline instance from a contained resource with additional rules', () => {
        const containedString = new ExportableCaretValueRule('');
        containedString.caretPath = 'contained[0].valueString';
        containedString.value = 'string value';
        valueSet.rules = [containedResourceType1, containedId1, containedString];
        const myPackage = new Package();
        myPackage.add(valueSet);
        optimizer.optimize(myPackage, fisher);

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
        expect(valueSet.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create a profiled inline instance from a contained resource with multiple profiles when the metaProfile option is first', () => {
        const containedProfile1 = new ExportableCaretValueRule('');
        containedProfile1.caretPath = 'contained[0].meta.profile[0]';
        containedProfile1.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        const containedProfile2 = new ExportableCaretValueRule('');
        containedProfile2.caretPath = 'contained[0].meta.profile[1]';
        containedProfile2.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        valueSet.rules = [
          containedResourceType1,
          containedId1,
          containedProfile1,
          containedProfile2
        ];
        const myPackage = new Package();
        myPackage.add(valueSet);
        optimizer.optimize(myPackage, fisher, { metaProfile: 'first' });

        expect(myPackage.instances).toHaveLength(1);
        const profileRule1 = new ExportableAssignmentRule('meta.profile[0]');
        profileRule1.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'http://hl7.org/fhir/StructureDefinition/vitalsigns',
          'Inline',
          undefined,
          undefined,
          [profileRule1]
        );
        // Even though the second entry in meta.profile won't resolve, we don't try to resolve them when there is more than one.
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(valueSet.rules).toEqual([inlineInstanceRule1]);
      });
    });

    describe('CodeSystems', () => {
      // All FSH types that use Caret rules work the same in this optimizer,
      // so a limited subset of the tests from StructureDefinitions are used here.
      let containedResourceType1: ExportableCaretValueRule;
      let containedId1: ExportableCaretValueRule;
      let codeSystem: ExportableCodeSystem;

      beforeEach(() => {
        containedResourceType1 = new ExportableCaretValueRule('');
        containedResourceType1.caretPath = 'contained[0].resourceType';
        containedResourceType1.value = 'Observation';
        containedId1 = new ExportableCaretValueRule('');
        containedId1.caretPath = 'contained[0].id';
        containedId1.value = 'Bar';

        codeSystem = new ExportableCodeSystem('MyCodeSystem');
      });

      it('should create an inline instance from a contained resource with additional rules', () => {
        const containedString = new ExportableCaretValueRule('');
        containedString.caretPath = 'contained[0].valueString';
        containedString.value = 'string value';
        codeSystem.rules = [containedResourceType1, containedId1, containedString];
        const myPackage = new Package();
        myPackage.add(codeSystem);
        optimizer.optimize(myPackage, fisher);

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
        expect(codeSystem.rules).toEqual([inlineInstanceRule1]);
      });

      it('should create a profiled inline instance from a contained resource with multiple profiles when the metaProfile option is first', () => {
        const containedProfile1 = new ExportableCaretValueRule('');
        containedProfile1.caretPath = 'contained[0].meta.profile[0]';
        containedProfile1.value = 'http://hl7.org/fhir/StructureDefinition/vitalsigns';
        const containedProfile2 = new ExportableCaretValueRule('');
        containedProfile2.caretPath = 'contained[0].meta.profile[1]';
        containedProfile2.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        codeSystem.rules = [
          containedResourceType1,
          containedId1,
          containedProfile1,
          containedProfile2
        ];
        const myPackage = new Package();
        myPackage.add(codeSystem);
        optimizer.optimize(myPackage, fisher, { metaProfile: 'first' });

        expect(myPackage.instances).toHaveLength(1);
        const profileRule1 = new ExportableAssignmentRule('meta.profile[0]');
        profileRule1.value =
          'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab';
        assertExportableInstance(
          myPackage.instances[0],
          'Bar',
          'http://hl7.org/fhir/StructureDefinition/vitalsigns',
          'Inline',
          undefined,
          undefined,
          [profileRule1]
        );
        // Even though the second entry in meta.profile won't resolve, we don't try to resolve them when there is more than one.
        expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);

        const inlineInstanceRule1 = new ExportableCaretValueRule('');
        inlineInstanceRule1.caretPath = 'contained[0]';
        inlineInstanceRule1.value = 'Bar';
        inlineInstanceRule1.isInstance = true;
        expect(codeSystem.rules).toEqual([inlineInstanceRule1]);
      });
    });
  });
});
