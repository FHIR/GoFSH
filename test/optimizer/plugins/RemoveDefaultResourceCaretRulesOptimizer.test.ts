import optimizer from '../../../src/optimizer/plugins/RemoveDefaultResourceCaretRulesOptimizer';
import { Package } from '../../../src/processor';
import {
  ExportableConfiguration,
  ExportableResource,
  ExportableCaretValueRule
} from '../../../src/exportable';

describe('optimizer', () => {
  describe('#remove_default_resource_caret_rules', () => {
    let myPackage: Package;

    beforeEach(() => {
      myPackage = new Package();
      const config = new ExportableConfiguration({
        canonical: 'http://example.org/gofsh/test',
        fhirVersion: ['4.0.1']
      });
      myPackage.add(config);
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('remove_default_resource_caret_rules_optimizer');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should remove a caret value rule on abstract with the default value', () => {
      const resource = new ExportableResource('MyResource');
      const abstractRule = new ExportableCaretValueRule('');
      abstractRule.caretPath = 'abstract';
      abstractRule.value = false;
      resource.rules.push(abstractRule);

      myPackage.add(resource);
      optimizer.optimize(myPackage);
      expect(resource.rules).toHaveLength(0);
    });

    it('should remove a caret value rule on type with the default value', () => {
      const resource = new ExportableResource('MyResource');
      resource.id = 'my-resource';
      const typeRule = new ExportableCaretValueRule('');
      typeRule.caretPath = 'type';
      typeRule.value = 'my-resource';
      resource.rules.push(typeRule);

      myPackage.add(resource);
      optimizer.optimize(myPackage);
      expect(resource.rules).toHaveLength(0);
    });
  });
});
