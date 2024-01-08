import { fshtypes } from 'fsh-sushi';
import {
  ExportableCaretValueRule,
  ExportableValueSet,
  ExportableValueSetConceptComponentRule
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/SeparateConceptsWithCaretRulesOptimizer';
import { Package } from '../../../src/processor';

describe('optimizer', () => {
  describe('#separate_concepts_with_caret_rules', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('separate_concepts_with_caret_rules');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toEqual(['resolve_value_set_component_rule_urls']);
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should group concept caret rules with their concept when there are rules for more than one concept from the same system', () => {
      const valueSet = new ExportableValueSet('MyValueSet');
      const zooConcepts = new ExportableValueSetConceptComponentRule(true);
      zooConcepts.from.system = 'http://example.org/zoo';
      zooConcepts.concepts = [
        new fshtypes.FshCode('tiger', 'http://example.org/zoo'),
        new fshtypes.FshCode('bear', 'http://example.org/zoo'),
        new fshtypes.FshCode('tarantula', 'http://example.org/zoo'),
        new fshtypes.FshCode('pelican', 'http://example.org/zoo'),
        new fshtypes.FshCode('hippo', 'http://example.org/zoo')
      ];

      const bearDesignationValue = new ExportableCaretValueRule('');
      bearDesignationValue.isCodeCaretRule = true;
      bearDesignationValue.pathArray = ['http://example.org/zoo#bear'];
      bearDesignationValue.caretPath = 'designation.value';
      bearDesignationValue.value = 'ourse';

      const bearDesignationLanguage = new ExportableCaretValueRule('');
      bearDesignationLanguage.isCodeCaretRule = true;
      bearDesignationLanguage.pathArray = ['http://example.org/zoo#bear'];
      bearDesignationLanguage.caretPath = 'designation.language';
      bearDesignationLanguage.value = new fshtypes.FshCode('fr');

      const pelicanDesignationValue = new ExportableCaretValueRule('');
      pelicanDesignationValue.isCodeCaretRule = true;
      pelicanDesignationValue.pathArray = ['http://example.org/zoo#pelican'];
      pelicanDesignationValue.caretPath = 'designation.value';
      pelicanDesignationValue.value = 'pelícano';

      const pelicanDesignationLanguage = new ExportableCaretValueRule('');
      pelicanDesignationLanguage.isCodeCaretRule = true;
      pelicanDesignationLanguage.pathArray = ['http://example.org/zoo#pelican'];
      pelicanDesignationLanguage.caretPath = 'designation.language';
      pelicanDesignationLanguage.value = new fshtypes.FshCode('es');

      valueSet.rules = [
        zooConcepts,
        bearDesignationValue,
        bearDesignationLanguage,
        pelicanDesignationValue,
        pelicanDesignationLanguage
      ];

      const myPackage = new Package();
      myPackage.add(valueSet);
      optimizer.optimize(myPackage);

      const expectedTigerConcept = new ExportableValueSetConceptComponentRule(true);
      expectedTigerConcept.from.system = 'http://example.org/zoo';
      expectedTigerConcept.concepts = [new fshtypes.FshCode('tiger', 'http://example.org/zoo')];

      const expectedBearConcept = new ExportableValueSetConceptComponentRule(true);
      expectedBearConcept.from.system = 'http://example.org/zoo';
      expectedBearConcept.concepts = [new fshtypes.FshCode('bear', 'http://example.org/zoo')];

      const expectedTarantulaConcept = new ExportableValueSetConceptComponentRule(true);
      expectedTarantulaConcept.from.system = 'http://example.org/zoo';
      expectedTarantulaConcept.concepts = [
        new fshtypes.FshCode('tarantula', 'http://example.org/zoo')
      ];

      const expectedPelicanConcept = new ExportableValueSetConceptComponentRule(true);
      expectedPelicanConcept.from.system = 'http://example.org/zoo';
      expectedPelicanConcept.concepts = [new fshtypes.FshCode('pelican', 'http://example.org/zoo')];

      const expectedHippoConcept = new ExportableValueSetConceptComponentRule(true);
      expectedHippoConcept.from.system = 'http://example.org/zoo';
      expectedHippoConcept.concepts = [new fshtypes.FshCode('hippo', 'http://example.org/zoo')];

      expect(valueSet.rules).toEqual([
        expectedTigerConcept,
        expectedBearConcept,
        bearDesignationValue,
        bearDesignationLanguage,
        expectedTarantulaConcept,
        expectedPelicanConcept,
        pelicanDesignationValue,
        pelicanDesignationLanguage,
        expectedHippoConcept
      ]);
    });
  });
});
