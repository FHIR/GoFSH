import optimizer from '../../../src/optimizer/plugins/SimplifyObeysRuleDotPathsOptimizer';
import { Package } from '../../../src/processor';
import {
  ExportableProfile,
  ExportableObeysRule,
  ExportableExtension,
  ExportableCaretValueRule
} from '../../../src/exportable';

describe('optimizer', () => {
  describe('simplify_obeys_rule_dot_paths', () => {
    let myPackage: Package;

    beforeEach(() => {
      myPackage = new Package();
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('simplify_obeys_rule_dot_paths');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should change dot paths to empty paths on obeys rules', () => {
      // Profile: MyPatient
      // Parent: Patient
      // . obeys my-3
      const profile = new ExportableProfile('MyPatient');
      profile.parent = 'Patient';
      const obeysRule = new ExportableObeysRule('.');
      obeysRule.keys = ['my-3'];
      profile.rules = [obeysRule];

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules[0].path).toBe('');
    });

    it('should not change dot paths on rules that are not obeys rules', () => {
      // Extension: MyExtension
      // * . ^short "Short text"
      const extension = new ExportableExtension('MyExtension');
      const caretRule = new ExportableCaretValueRule('.');
      caretRule.caretPath = 'short';
      caretRule.value = 'Short text';
      extension.rules = [caretRule];

      myPackage.add(extension);
      optimizer.optimize(myPackage);
      expect(extension.rules[0].path).toBe('.');
    });

    it('should not change paths that are not dot paths on obeys rules', () => {
      // Profile: MyPatient
      // Parent: Patient
      // * name obeys my-5
      const profile = new ExportableProfile('MyPatient');
      profile.parent = 'Patient';
      const obeysRule = new ExportableObeysRule('name');
      obeysRule.keys = ['my-5'];
      profile.rules = [obeysRule];

      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules[0].path).toBe('name');
    });
  });
});
