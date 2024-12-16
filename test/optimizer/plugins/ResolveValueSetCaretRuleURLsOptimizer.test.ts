import path from 'path';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { LakeOfFHIR, Package } from '../../../src/processor';
import { ExportableValueSet, ExportableCaretValueRule } from '../../../src/exportable';
import { FHIRDefinitions, MasterFisher } from '../../../src/utils';
import { loadTestDefinitions, stockLake } from '../../helpers';
import optimizer from '../../../src/optimizer/plugins/ResolveValueSetCaretRuleURLsOptimizer';

describe('optimizer', () => {
  describe('#resolve_value_set_caret_rule_urls', () => {
    let defs: FHIRDefinitions;
    let lake: LakeOfFHIR;
    let fisher: MasterFisher;

    beforeAll(async () => {
      defs = await loadTestDefinitions();
      lake = await stockLake(path.join(__dirname, 'fixtures', 'simple-codesystem.json'));
      fisher = new MasterFisher(lake, defs);
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('resolve_value_set_caret_rule_urls');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toEqual(['resolve_value_set_component_rule_urls']);
    });

    it('should replace caret rule system url with the name of a local CodeSystem', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableCaretValueRule('');
      rule.caretPath = 'designation.use.display';
      rule.pathArray = ['http://example.org/tests/CodeSystem/simple.codesystem#toast'];
      rule.value = 'Complete bread classification';
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      expect(rule.pathArray).toEqual(['SimpleCodeSystem#toast']);
    });

    it('should replace caret rule system url with the name of a core FHIR CodeSystem', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableCaretValueRule('');
      rule.caretPath = 'designation.use.display';
      rule.pathArray = ['http://hl7.org/fhir/observation-status#draft'];
      rule.value = 'Complete bread classification';
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      expect(rule.pathArray).toEqual(['ObservationStatus#draft']);
    });

    it('should replace caret rule system url with an alias when the system definition is not known and alias is true', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableCaretValueRule('');
      rule.caretPath = 'designation.use.display';
      rule.pathArray = ['http://example.org/tests/CodeSystem/mystery.codesystem#toast'];
      rule.value = 'Complete bread classification';
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher, { alias: true });

      const mysteryAlias = myPackage.aliases.find(
        alias => alias.url === 'http://example.org/tests/CodeSystem/mystery.codesystem'
      );
      expect(mysteryAlias).toBeDefined();
      expect(rule.pathArray).toEqual([`${mysteryAlias?.alias}#toast`]);
    });

    it('should replace caret rule system url with an alias when the system definition is not known and alias is undefined', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableCaretValueRule('');
      rule.caretPath = 'designation.use.display';
      rule.pathArray = ['http://example.org/tests/CodeSystem/mystery.codesystem#toast'];
      rule.value = 'Complete bread classification';
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      const mysteryAlias = myPackage.aliases.find(
        alias => alias.url === 'http://example.org/tests/CodeSystem/mystery.codesystem'
      );
      expect(mysteryAlias).toBeDefined();
      expect(rule.pathArray).toEqual([`${mysteryAlias?.alias}#toast`]);
    });

    it('should not replace caret rule system url with an alias when the system definition is not known and alias is false', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableCaretValueRule('');
      rule.caretPath = 'designation.use.display';
      rule.pathArray = ['http://example.org/tests/CodeSystem/mystery.codesystem#toast'];
      rule.value = 'Complete bread classification';
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher, { alias: false });

      expect(rule.pathArray).toEqual([
        'http://example.org/tests/CodeSystem/mystery.codesystem#toast'
      ]);
    });
  });
});
