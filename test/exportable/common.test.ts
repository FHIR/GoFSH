import { switchQuantityRules } from '../../src/exportable/common';
import {
  ExportableInstance,
  ExportableAssignmentRule,
  ExportableProfile,
  ExportableOnlyRule,
  ExportableExtension
} from '../../src/exportable';
import { fshtypes } from 'fsh-sushi';

describe('common.ts', () => {
  describe('switchQuantityRules', () => {
    it('should ensure Quantity.unit assignmenet rules appear after Quantity rules on Instances', () => {
      const testObservation = new ExportableInstance('TestObservation');
      testObservation.instanceOf = 'Observation';

      const unitRule = new ExportableAssignmentRule('valueQuantity.unit');
      unitRule.value = 'lb';
      testObservation.rules.push(unitRule);

      const statusRule = new ExportableAssignmentRule('status');
      statusRule.value = new fshtypes.FshCode('preliminary');
      testObservation.rules.push(statusRule);

      const quantityRule = new ExportableAssignmentRule('valueQuantity');
      quantityRule.value = new fshtypes.FshQuantity(82, new fshtypes.FshCode('[lb_av]'));
      testObservation.rules.push(quantityRule);

      // A valueQuantity rule should appear after a valueQuantity.unit rule
      expect(testObservation.rules[0]).toBe(unitRule);
      expect(testObservation.rules[2]).toBe(quantityRule);

      // The valurQuantity rule should now appear directly before the valueQuantity.unit rule
      switchQuantityRules(testObservation);
      expect(testObservation.rules[0]).toBe(quantityRule);
      expect(testObservation.rules[1]).toBe(unitRule);
    });

    it('should ensure Quantity.unit assignmenet rules appear after Quantity rules on Profiles', () => {
      const childObservation = new ExportableProfile('ChildObservation');
      childObservation.parent = 'Observation';
      childObservation.id = 'child-observation';

      const onlyRule = new ExportableOnlyRule('value[x]');
      onlyRule.types = [{ type: 'Quantity' }];
      childObservation.rules.push(onlyRule);

      const unitRule = new ExportableAssignmentRule('valueQuantity.unit');
      unitRule.value = 'lb';
      childObservation.rules.push(unitRule);

      const statusRule = new ExportableAssignmentRule('status');
      statusRule.value = new fshtypes.FshCode('preliminary');
      childObservation.rules.push(statusRule);

      const quantityRule = new ExportableAssignmentRule('valueQuantity');
      quantityRule.value = new fshtypes.FshQuantity(82, new fshtypes.FshCode('[lb_av]'));
      childObservation.rules.push(quantityRule);

      // A valueQuantity rule should appear after a valueQuantity.unit rule
      expect(childObservation.rules[1]).toBe(unitRule);
      expect(childObservation.rules[3]).toBe(quantityRule);

      // The valurQuantity rule should now appear directly before the valueQuantity.unit rule
      switchQuantityRules(childObservation);
      expect(childObservation.rules[1]).toBe(quantityRule);
      expect(childObservation.rules[2]).toBe(unitRule);
    });

    it('should ensure Quantity.unit assignmenet rules appear after Quantity rules on Extension', () => {
      const childExtension = new ExportableExtension('ChildExtension');
      childExtension.id = 'child-extension';

      const onlyRule = new ExportableOnlyRule('value[x]');
      onlyRule.types = [{ type: 'Quantity' }];
      childExtension.rules.push(onlyRule);

      const unitRule = new ExportableAssignmentRule('valueQuantity.unit');
      unitRule.value = 'lb';
      childExtension.rules.push(unitRule);

      const statusRule = new ExportableAssignmentRule('status');
      statusRule.value = new fshtypes.FshCode('preliminary');
      childExtension.rules.push(statusRule);

      const quantityRule = new ExportableAssignmentRule('valueQuantity');
      quantityRule.value = new fshtypes.FshQuantity(82, new fshtypes.FshCode('[lb_av]'));
      childExtension.rules.push(quantityRule);

      // A valueQuantity rule should appear after a valueQuantity.unit rule
      expect(childExtension.rules[1]).toBe(unitRule);
      expect(childExtension.rules[3]).toBe(quantityRule);

      // The valurQuantity rule should now appear directly before the valueQuantity.unit rule
      switchQuantityRules(childExtension);
      expect(childExtension.rules[1]).toBe(quantityRule);
      expect(childExtension.rules[2]).toBe(unitRule);
    });
  });
});
