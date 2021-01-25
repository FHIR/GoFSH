import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import { ExportableInstance } from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/SimplifyInstanceNameOptimizer';

describe('optimizer', () => {
  describe('#simplify_instance_names', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('simplify_instance_names');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeDefined();
    });

    it('should make instance names unique', () => {
      const instance1 = new ExportableInstance('MyExample');
      instance1.instanceOf = 'Condition';
      const instance2 = new ExportableInstance('MyExample');
      instance2.instanceOf = 'Patient';
      const instance3 = new ExportableInstance('MyObservationExample');
      instance3.instanceOf = 'Observation';
      const myPackage = new Package();
      myPackage.add(instance1);
      myPackage.add(instance2);
      myPackage.add(instance3);
      optimizer.optimize(myPackage);

      const expectedInstance1 = new ExportableInstance('MyExample');
      expectedInstance1.instanceOf = 'Condition';
      expectedInstance1.name = 'MyExample-for-Condition'; // Name includes additional info because it conflicts
      const expectedInstance2 = new ExportableInstance('MyExample');
      expectedInstance2.instanceOf = 'Patient';
      expectedInstance2.name = 'MyExample-for-Patient'; // Name includes additional info because it conflicts
      const expectedInstance3 = new ExportableInstance('MyObservationExample');
      expectedInstance3.instanceOf = 'Observation';
      expectedInstance3.name = 'MyObservationExample'; // Name does not include additional info because it does not conflict
      expect(myPackage.instances).toEqual([
        expectedInstance1,
        expectedInstance2,
        expectedInstance3
      ]);
    });
  });
});
