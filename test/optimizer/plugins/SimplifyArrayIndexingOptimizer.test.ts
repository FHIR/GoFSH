import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableInstance,
  ExportableProfile
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/SimplifyArrayIndexingOptimizer';

describe('optimizer', () => {
  describe('#simplify_array_indexing', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('simplify_array_indexing');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toStrictEqual([/.*/]);
    });

    it('should remove zero indices from elements referencing a singleton array', () => {
      const instance = new ExportableInstance('testPatient');
      instance.instanceOf = 'Patient';

      const nameRule1 = new ExportableAssignmentRule('name[0].given[0]');
      nameRule1.value = 'John';

      const nameRule2 = new ExportableAssignmentRule('name[0].family');
      nameRule2.value = 'Doe';

      instance.rules.push(nameRule1, nameRule2);
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage);

      expect(myPackage.instances[0].rules[0].path).toBe('name.given');
      expect(myPackage.instances[0].rules[1].path).toBe('name.family');
    });

    it('should convert non-zero numeric indices to soft indexing', () => {
      const instance = new ExportableInstance('testPatient');
      instance.instanceOf = 'Patient';

      const nameRule1 = new ExportableAssignmentRule('name[0].given[0]');
      nameRule1.value = 'John';

      const nameRule2 = new ExportableAssignmentRule('name[0].family');
      nameRule1.value = 'Doe';

      const nameRule3 = new ExportableAssignmentRule('name[1].given[0]');
      nameRule2.value = 'James';

      instance.rules.push(nameRule1, nameRule2, nameRule3);
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage);

      expect(myPackage.instances[0].rules[0].path).toBe('name[0].given');
      expect(myPackage.instances[0].rules[1].path).toBe('name[=].family');
      expect(myPackage.instances[0].rules[2].path).toBe('name[+].given');
    });

    it('should avoid using soft indexing when gaps exist on an elements array', () => {
      const instance = new ExportableInstance('testPatient');
      instance.instanceOf = 'Patient';

      const nameRule1 = new ExportableAssignmentRule('name[0].given[0]');
      nameRule1.value = 'John';

      const nameRule2 = new ExportableAssignmentRule('name[0].family');
      nameRule1.value = 'Doe';

      const nameRule3 = new ExportableAssignmentRule('name[5].given[0]');
      nameRule2.value = 'James';

      instance.rules.push(nameRule1, nameRule2, nameRule3);
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage);

      expect(myPackage.instances[0].rules[0].path).toBe('name[0].given');
      expect(myPackage.instances[0].rules[1].path).toBe('name[=].family');
      expect(myPackage.instances[0].rules[2].path).toBe('name[5].given');
    });

    it('should apply soft indexing on caret paths', () => {
      const profile = new ExportableProfile('MyProfile');
      const caretRule1 = new ExportableCaretValueRule('');
      caretRule1.caretPath = 'contact[0].name';

      const caretRule2 = new ExportableCaretValueRule('');
      caretRule2.caretPath = 'contact[0].phone';

      const caretRule3 = new ExportableCaretValueRule('');
      caretRule3.caretPath = 'contact[0].email';

      const caretRule4 = new ExportableCaretValueRule('');
      caretRule4.caretPath = 'contact[1].phone';

      profile.rules.push(caretRule1, caretRule2, caretRule3, caretRule4);

      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage);

      const optimizedCaretRules = myPackage.profiles[0].rules as ExportableCaretValueRule[];

      expect(optimizedCaretRules[0].caretPath).toBe('contact[0].name');
      expect(optimizedCaretRules[1].caretPath).toBe('contact[=].phone');
      expect(optimizedCaretRules[2].caretPath).toBe('contact[=].email');
      expect(optimizedCaretRules[3].caretPath).toBe('contact[+].phone');
    });
  });
});
