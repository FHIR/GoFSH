import { switchQuantityRules } from '../../src/processor/common';
import {
  ExportableAssignmentRule,
  ExportableOnlyRule,
  ExportableSdRule
} from '../../src/exportable';
import { fshtypes } from 'fsh-sushi';

describe('common.ts', () => {
  describe('switchQuantityRules', () => {
    it('should ensure Quantity.unit assignmenet rules appear after Quantity rules', () => {
      const exampleRules: ExportableSdRule[] = [];
      const onlyRule = new ExportableOnlyRule('value[x]');
      onlyRule.types = [{ type: 'Quantity' }];
      exampleRules.push(onlyRule);

      const unitRule = new ExportableAssignmentRule('valueQuantity.unit');
      unitRule.value = 'lb';
      exampleRules.push(unitRule);

      const statusRule = new ExportableAssignmentRule('status');
      statusRule.value = new fshtypes.FshCode('preliminary');
      exampleRules.push(statusRule);

      const quantityRule = new ExportableAssignmentRule('valueQuantity');
      quantityRule.value = new fshtypes.FshQuantity(82, new fshtypes.FshCode('[lb_av]'));
      exampleRules.push(quantityRule);

      // A valueQuantity rule should appear after a valueQuantity.unit rule
      expect(exampleRules[1]).toBe(unitRule);
      expect(exampleRules[3]).toBe(quantityRule);

      // The valueQuantity rule should now appear directly before the valueQuantity.unit rule
      switchQuantityRules(exampleRules);
      expect(exampleRules[1]).toBe(quantityRule);
      expect(exampleRules[2]).toBe(unitRule);
    });
  });
});
