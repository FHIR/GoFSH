import path from 'path';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import { ExportableAssignmentRule, ExportableInstance } from '../../../src/exportable';
import { MasterFisher } from '../../../src/utils';
import { loadTestDefinitions, stockLake } from '../../helpers';
import optimizer from '../../../src/optimizer/plugins/SimplifyInstanceNameOptimizer';
import ResolveInstanceOfURLsOptimizer from '../../../src/optimizer/plugins/ResolveInstanceOfURLsOptimizer';
import SimplifyArrayIndexingOptimizer from '../../../src/optimizer/plugins/SimplifyArrayIndexingOptimizer';

describe('optimizer', () => {
  describe('#simplify_instance_names', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('simplify_instance_names');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toEqual([SimplifyArrayIndexingOptimizer.name]);
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
      const myPackage = new Package();
      myPackage.add(instance1);
      myPackage.add(instance2);
      myPackage.add(instance3);
      optimizer.optimize(myPackage);

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
      expect(myPackage.instances).toEqual([
        expectedInstance1,
        expectedInstance2,
        expectedInstance3
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
      const myPackage = new Package();
      myPackage.add(instance1);
      myPackage.add(instance2);

      // Resolve InstanceOf URLs first, then simplify Instance names to check they are updated according to the alias
      ResolveInstanceOfURLsOptimizer.optimize(myPackage, fisher);
      optimizer.optimize(myPackage);

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
      expect(myPackage.instances).toEqual([expectedInstance1, expectedInstance2]);
    });
  });
});
