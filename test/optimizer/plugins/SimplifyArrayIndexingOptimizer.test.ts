import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableInstance,
  ExportableProfile,
  ExportableLogical,
  ExportableResource,
  ExportableCodeSystem
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/SimplifyArrayIndexingOptimizer';

describe('optimizer', () => {
  describe('#simplify_array_indexing', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('simplify_array_indexing');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toStrictEqual([/(add|combine|construct|remove|resolve).*/]);
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
      nameRule2.value = 'Doe';

      const nameRule3 = new ExportableAssignmentRule('name[5].given[0]');
      nameRule3.value = 'James';

      instance.rules.push(nameRule1, nameRule2, nameRule3);
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage);

      expect(myPackage.instances[0].rules[0].path).toBe('name[0].given');
      expect(myPackage.instances[0].rules[1].path).toBe('name[=].family');
      expect(myPackage.instances[0].rules[2].path).toBe('name[5].given');
    });

    it('should apply soft indexing on caret paths for a Profile', () => {
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

    it('should apply soft indexing on caret paths for a Logical', () => {
      const logical = new ExportableLogical('MyLogical');
      const caretRule1 = new ExportableCaretValueRule('');
      caretRule1.caretPath = 'contact[0].name';

      const caretRule2 = new ExportableCaretValueRule('');
      caretRule2.caretPath = 'contact[0].phone';

      const caretRule3 = new ExportableCaretValueRule('');
      caretRule3.caretPath = 'contact[0].email';

      const caretRule4 = new ExportableCaretValueRule('');
      caretRule4.caretPath = 'contact[1].phone';

      logical.rules.push(caretRule1, caretRule2, caretRule3, caretRule4);

      const myPackage = new Package();
      myPackage.add(logical);
      optimizer.optimize(myPackage);

      const optimizedCaretRules = myPackage.logicals[0].rules as ExportableCaretValueRule[];

      expect(optimizedCaretRules[0].caretPath).toBe('contact[0].name');
      expect(optimizedCaretRules[1].caretPath).toBe('contact[=].phone');
      expect(optimizedCaretRules[2].caretPath).toBe('contact[=].email');
      expect(optimizedCaretRules[3].caretPath).toBe('contact[+].phone');
    });

    it('should apply soft indexing on caret paths for a Resource', () => {
      const resource = new ExportableResource('MyResource');
      const caretRule1 = new ExportableCaretValueRule('');
      caretRule1.caretPath = 'contact[0].name';

      const caretRule2 = new ExportableCaretValueRule('');
      caretRule2.caretPath = 'contact[0].phone';

      const caretRule3 = new ExportableCaretValueRule('');
      caretRule3.caretPath = 'contact[0].email';

      const caretRule4 = new ExportableCaretValueRule('');
      caretRule4.caretPath = 'contact[1].phone';

      resource.rules.push(caretRule1, caretRule2, caretRule3, caretRule4);

      const myPackage = new Package();
      myPackage.add(resource);
      optimizer.optimize(myPackage);

      const optimizedCaretRules = myPackage.resources[0].rules as ExportableCaretValueRule[];

      expect(optimizedCaretRules[0].caretPath).toBe('contact[0].name');
      expect(optimizedCaretRules[1].caretPath).toBe('contact[=].phone');
      expect(optimizedCaretRules[2].caretPath).toBe('contact[=].email');
      expect(optimizedCaretRules[3].caretPath).toBe('contact[+].phone');
    });

    it('should apply soft indexing on caret paths on concepts for a CodeSystem', () => {
      const codeSystem = new ExportableCodeSystem('MyCS');

      // const bread = new ExportableConceptRule('bread');
      const breadProperty = new ExportableCaretValueRule('');
      breadProperty.isCodeCaretRule = true;
      breadProperty.pathArray = ['bread'];
      breadProperty.caretPath = 'property[0].code';
      const breadLanguage = new ExportableCaretValueRule('');
      breadLanguage.isCodeCaretRule = true;
      breadLanguage.pathArray = ['bread'];
      breadLanguage.caretPath = 'designation[0].language';
      const breadUse = new ExportableCaretValueRule('');
      breadUse.isCodeCaretRule = true;
      breadUse.pathArray = ['bread'];
      breadUse.caretPath = 'designation[0].use';

      // const cake = new ExportableConceptRule('cake');
      const cakeLanguage0 = new ExportableCaretValueRule('');
      cakeLanguage0.isCodeCaretRule = true;
      cakeLanguage0.pathArray = ['cake'];
      cakeLanguage0.caretPath = 'designation[0].language';
      const cakeUse0 = new ExportableCaretValueRule('');
      cakeUse0.isCodeCaretRule = true;
      cakeUse0.pathArray = ['cake'];
      cakeUse0.caretPath = 'designation[0].use';
      const cakeLanguage1 = new ExportableCaretValueRule('');
      cakeLanguage1.isCodeCaretRule = true;
      cakeLanguage1.pathArray = ['cake'];
      cakeLanguage1.caretPath = 'designation[1].language';
      const cakeUse1 = new ExportableCaretValueRule('');
      cakeUse1.isCodeCaretRule = true;
      cakeUse1.pathArray = ['cake'];
      cakeUse1.caretPath = 'designation[1].use';

      codeSystem.rules.push(
        // bread,
        breadProperty,
        breadLanguage,
        breadUse,
        // cake,
        cakeLanguage0,
        cakeUse0,
        cakeLanguage1,
        cakeUse1
      );

      const myPackage = new Package();
      myPackage.add(codeSystem);
      optimizer.optimize(myPackage);

      const optimizedCaretRules = myPackage.codeSystems[0].rules as ExportableCaretValueRule[];
      expect(optimizedCaretRules[0].caretPath).toBe('property.code');
      expect(optimizedCaretRules[1].caretPath).toBe('designation[0].language');
      expect(optimizedCaretRules[2].caretPath).toBe('designation[=].use');
      expect(optimizedCaretRules[3].caretPath).toBe('designation[0].language');
      expect(optimizedCaretRules[4].caretPath).toBe('designation[=].use');
      expect(optimizedCaretRules[5].caretPath).toBe('designation[+].language');
      expect(optimizedCaretRules[6].caretPath).toBe('designation[=].use');
    });
  });
});
