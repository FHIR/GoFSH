import path from 'path';
import { cloneDeep } from 'lodash';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor';
import { ExportableBindingRule, ExportableProfile } from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/ResolveBindingRuleURLsOptimizer';
import { loadTestDefinitions, stockLake } from '../../helpers';
import { MasterFisher } from '../../../src/utils';

describe('optimizer', () => {
  describe('#resolve_binding_rule_urls', () => {
    let fisher: MasterFisher;

    beforeAll(async () => {
      const defs = await loadTestDefinitions();
      const lake = await stockLake(path.join(__dirname, 'fixtures', 'simple-valueset.json'));
      fisher = new MasterFisher(lake, defs);
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('resolve_binding_rule_urls');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should resolve the valueSet url on a binding rule', () => {
      const profile = new ExportableProfile('Foo');
      profile.parent = 'Observation';
      const codeRule = new ExportableBindingRule('code');
      codeRule.valueSet = 'http://example.org/tests/ValueSet/simple.valueset';
      profile.rules = [codeRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = cloneDeep(codeRule);
      expectedRule.valueSet = 'SimpleValueSet';
      expect(profile.rules[0]).toEqual(expectedRule);
    });

    it('should alias the valueSet url on a binding rule if it cannot be resolved and alias is true', () => {
      const profile = new ExportableProfile('Foo');
      profile.parent = 'Observation';
      const codeRule = new ExportableBindingRule('code');
      codeRule.valueSet = 'http://loinc.org';
      profile.rules = [codeRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher, { alias: true });

      const expectedRule = cloneDeep(codeRule);
      expectedRule.valueSet = '$loinc';
      expect(profile.rules[0]).toEqual(expectedRule);
      expect(myPackage.aliases).toEqual([{ alias: '$loinc', url: 'http://loinc.org' }]);
    });

    it('should alias the valueSet url on a binding rule if it cannot be resolved and alias is undefined', () => {
      const profile = new ExportableProfile('Foo');
      profile.parent = 'Observation';
      const codeRule = new ExportableBindingRule('code');
      codeRule.valueSet = 'http://loinc.org';
      profile.rules = [codeRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = cloneDeep(codeRule);
      expectedRule.valueSet = '$loinc';
      expect(profile.rules[0]).toEqual(expectedRule);
      expect(myPackage.aliases).toEqual([{ alias: '$loinc', url: 'http://loinc.org' }]);
    });

    it('should not alias the valueSet url on a binding rule if alias is false', () => {
      const profile = new ExportableProfile('Foo');
      profile.parent = 'Observation';
      const codeRule = new ExportableBindingRule('code');
      codeRule.valueSet = 'http://loinc.org';
      profile.rules = [codeRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher, { alias: false });

      expect(profile.rules[0]).toEqual(codeRule);
      expect(myPackage.aliases).toHaveLength(0);
    });

    it('should maintain the original value when it cannot be aliased', () => {
      const profile = new ExportableProfile('Foo');
      profile.parent = 'Observation';
      const codeRule = new ExportableBindingRule('code');
      codeRule.valueSet = 'urn:oid:123:these:tests:are:killing:me';
      profile.rules = [codeRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher);

      expect(profile.rules[0]).toEqual(codeRule);
    });
  });
});
