import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor';
import { ExportableAssignmentRule, ExportableInstance } from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/ConstructInlineInstanceOptimizer';
import { assertExportableInstance } from '../../helpers/asserts';

describe('optimizer', () => {
  describe('#construct_inline_instance', () => {
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
      instance.rules = [containedResourceType1, containedId1, containedResourceType2, containedId2];
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

    it('should create an inline instance from a contained resource with additional rules', () => {
      const containedString = new ExportableAssignmentRule('contained[0].valueString');
      containedString.value = 'string value';
      instance.rules = [containedResourceType1, containedId1, containedString];
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
        [containedString]
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
      containedString.value = 'Boo';

      instance.rules = [containedResourceType1, containedId1, containedString, nonContainedRule];
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
        [containedString]
      );

      const inlineInstanceRule1 = new ExportableAssignmentRule('contained[0]');
      inlineInstanceRule1.value = 'Bar';
      inlineInstanceRule1.isInstance = true;
      expect(instance.rules).toEqual([nonContainedRule, inlineInstanceRule1]);
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
});
