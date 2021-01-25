import optimizer from '../../../src/optimizer/plugins/SwitchQuantityAndUnitRulesOptimizer';
import { Package } from '../../../src/processor/Package';
import { ExportableAssignmentRule, ExportableInstance } from '../../../src/exportable';
import { FshCode, FshQuantity } from 'fsh-sushi/dist/fshtypes';

describe('optimizer', () => {
  describe('#switch_quantity_unit_rules', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('switch_quantity_unit_rules');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should move assignment rules setting quantity to be before rules setting quantity.unit', () => {
      const testObservation = new ExportableInstance('TestObservation');
      testObservation.instanceOf = 'Observation';

      const unitRule = new ExportableAssignmentRule('valueQuantity.unit');
      unitRule.value = 'lb';
      testObservation.rules.push(unitRule);

      const statusRule = new ExportableAssignmentRule('status');
      statusRule.value = new FshCode('preliminary');
      testObservation.rules.push(statusRule);

      const quantityRule = new ExportableAssignmentRule('valueQuantity');
      quantityRule.value = new FshQuantity(82, new FshCode('[lb_av]'));
      testObservation.rules.push(quantityRule);

      // Instance:   TestObservation
      // InstanceOf:  Observation
      // * valueQuantity.unit = "lb"
      // * status = 'preliminary'
      // * valueQuantity = 82 '[lb_av]'
      const testPackage = new Package();
      testPackage.add(testObservation);
      optimizer.optimize(testPackage);

      // Instance:   TestObservation
      // InstanceOf:  Observation
      // * valueQuantity.unit = "lb"
      // * valueQuantity = 82 '[lb_av]'
      // * status = 'preliminary'

      const optimizedInstance = testPackage.instances[0];
      expect(optimizedInstance.rules[0]).toEqual(quantityRule);
      expect(optimizedInstance.rules[1]).toEqual(unitRule);
    });
  });
});
