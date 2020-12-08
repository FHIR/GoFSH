import path from 'path';
import { fhirdefs } from 'fsh-sushi';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { LakeOfFHIR, Package } from '../../../src/processor';
import {
  ExportableValueSet,
  ExportableValueSetConceptComponentRule,
  ExportableValueSetFilterComponentRule
} from '../../../src/exportable';
import { MasterFisher } from '../../../src/utils';
import { loadTestDefinitions, stockLake } from '../../helpers';
import optimizer from '../../../src/optimizer/plugins/ResolveValueSetComponentRuleURLsOptimizer';
import { cloneDeep } from 'lodash';
import { FshCode } from 'fsh-sushi/dist/fshtypes';

describe('optimizer', () => {
  describe('#resolve_value_set_component_rule_urls', () => {
    let defs: fhirdefs.FHIRDefinitions;
    let lake: LakeOfFHIR;
    let fisher: MasterFisher;

    beforeAll(() => {
      defs = loadTestDefinitions();
      lake = stockLake(
        path.join(__dirname, 'fixtures', 'simple-codesystem.json'),
        path.join(__dirname, 'fixtures', 'unsupported-codesystem.json'),
        path.join(__dirname, 'fixtures', 'simple-valueset.json'),
        path.join(__dirname, 'fixtures', 'unsupported-valueset.json')
      );
      fisher = new MasterFisher(lake, defs);
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('resolve_value_set_component_rule_urls');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should replace filter rule system url with the name of a local CodeSystem', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableValueSetFilterComponentRule(true);
      rule.from = { system: 'http://example.org/tests/CodeSystem/simple.codesystem' };
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = new ExportableValueSetFilterComponentRule(true);
      expectedRule.from = { system: 'SimpleCodeSystem' };
      expect(valueset.rules).toContainEqual(expectedRule);
    });

    it('should replace concept rule system url with the name of a local CodeSystem', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableValueSetConceptComponentRule(true);
      rule.from = { system: 'http://example.org/tests/CodeSystem/simple.codesystem' };
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = new ExportableValueSetConceptComponentRule(true);
      expectedRule.from = { system: 'SimpleCodeSystem' };
      expect(valueset.rules).toContainEqual(expectedRule);
    });

    it('should replace filter rule system url with the name of a core FHIR CodeSystem', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableValueSetFilterComponentRule(true);
      rule.from = { system: 'http://hl7.org/fhir/observation-status' };
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = new ExportableValueSetFilterComponentRule(true);
      expectedRule.from = { system: 'ObservationStatus' };
      expect(valueset.rules).toContainEqual(expectedRule);
    });

    it('should alias filter rule system url when it is same as local code system name', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableValueSetFilterComponentRule(true);
      rule.from = { system: 'http://hl7.org/fhir/observation-status' };
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);

      // Use a modified lake and fisher to force the local CS to have the same name
      const modLake = cloneDeep(lake);
      modLake.docs[0].content.name = 'ObservationStatus';
      optimizer.optimize(myPackage, new MasterFisher(modLake, defs));

      const expectedRule = new ExportableValueSetFilterComponentRule(true);
      expectedRule.from = { system: '$observation-status' };
      expect(valueset.rules).toContainEqual(expectedRule);
      expect(myPackage.aliases).toEqual([
        { alias: '$observation-status', url: 'http://hl7.org/fhir/observation-status' }
      ]);
    });

    // TODO: Revisit this when SUSHI supports fishing for Instance CodeSystems by name/id
    it('should not replace filter rule system url with the name of a local unsupported CodeSystem', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableValueSetFilterComponentRule(true);
      rule.from = { system: 'http://example.org/tests/CodeSystem/unsupported.codesystem' };
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = new ExportableValueSetFilterComponentRule(true);
      expectedRule.from = { system: '$unsupported.codesystem' };
      expect(valueset.rules).toContainEqual(expectedRule);
    });

    it('should replace filter rule valueset url with the name of a local ValueSet', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableValueSetFilterComponentRule(true);
      rule.from = { valueSets: ['http://example.org/tests/ValueSet/simple.valueset'] };
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = new ExportableValueSetFilterComponentRule(true);
      expectedRule.from = { valueSets: ['SimpleValueSet'] };
      expect(valueset.rules).toContainEqual(expectedRule);
    });

    it('should replace concept rule valueset url with the name of a local ValueSet', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableValueSetConceptComponentRule(true);
      rule.from = { valueSets: ['http://example.org/tests/ValueSet/simple.valueset'] };
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = new ExportableValueSetConceptComponentRule(true);
      expectedRule.from = { valueSets: ['SimpleValueSet'] };
      expect(valueset.rules).toContainEqual(expectedRule);
    });

    it('should replace filter rule valueset url with the name of a core FHIR CodeSystem', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableValueSetFilterComponentRule(true);
      rule.from = { valueSets: ['http://hl7.org/fhir/ValueSet/observation-status'] };
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = new ExportableValueSetFilterComponentRule(true);
      expectedRule.from = { valueSets: ['ObservationStatus'] };
      expect(valueset.rules).toContainEqual(expectedRule);
    });

    it('should alias the filter rule system url when it is same as local code system name', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableValueSetFilterComponentRule(true);
      rule.from = { valueSets: ['http://hl7.org/fhir/ValueSet/observation-status'] };
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);

      // Use a modified lake and fisher to force the local CS to have the same name
      const modLake = cloneDeep(lake);
      modLake.docs[2].content.name = 'ObservationStatus';
      optimizer.optimize(myPackage, new MasterFisher(modLake, defs));

      const expectedRule = new ExportableValueSetFilterComponentRule(true);
      expectedRule.from = { valueSets: ['$observation-status'] };
      expect(valueset.rules).toContainEqual(expectedRule);
      expect(myPackage.aliases).toEqual([
        { alias: '$observation-status', url: 'http://hl7.org/fhir/ValueSet/observation-status' }
      ]);
    });

    // TODO: Revisit this when SUSHI supports fishing for Instance ValueSets by name/id
    it('should not replace filter rule valueset url with the name of a local unsupported ValueSet', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableValueSetFilterComponentRule(true);
      rule.from = { valueSets: ['http://example.org/tests/ValueSet/unsupported.valueset'] };
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = new ExportableValueSetFilterComponentRule(true);
      expectedRule.from = { valueSets: ['$unsupported.valueset'] };
      expect(valueset.rules).toContainEqual(expectedRule);
    });

    it('should replace concept rule concept system url with the name of a local CodeSystem', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableValueSetConceptComponentRule(true);
      rule.concepts = [
        new FshCode('A', 'http://example.org/tests/CodeSystem/simple.codesystem', 'Letter A')
      ];
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = new ExportableValueSetConceptComponentRule(true);
      expectedRule.concepts = [new FshCode('A', 'SimpleCodeSystem', 'Letter A')];
      expect(valueset.rules).toContainEqual(expectedRule);
    });

    it('should replace concept rule concept system url with the name of a core FHIR CodeSystem', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableValueSetConceptComponentRule(true);
      rule.concepts = [new FshCode('final', 'http://hl7.org/fhir/observation-status', 'Final')];
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = new ExportableValueSetConceptComponentRule(true);
      expectedRule.concepts = [new FshCode('final', 'ObservationStatus', 'Final')];
      expect(valueset.rules).toContainEqual(expectedRule);
    });

    it('should not replace concept rule concept system url with the name of a core FHIR CodeSystem when it is same as local code system name', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableValueSetConceptComponentRule(true);
      rule.concepts = [new FshCode('final', 'http://hl7.org/fhir/observation-status', 'Final')];
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      // Use a modified lake and fisher to force the local CS to have the same name
      const modLake = cloneDeep(lake);
      modLake.docs[0].content.name = 'ObservationStatus';
      optimizer.optimize(myPackage, new MasterFisher(modLake, defs));

      const expectedRule = new ExportableValueSetConceptComponentRule(true);
      expectedRule.concepts = [new FshCode('final', 'ObservationStatus', 'Final')];
      expect(valueset.rules).toContainEqual(expectedRule);
    });

    it('should not replace concept rule concept system url with the name of a local unsupported CodeSystem', () => {
      const valueset = new ExportableValueSet('MyValueSet');
      const rule = new ExportableValueSetConceptComponentRule(true);
      rule.concepts = [
        new FshCode('A', 'http://example.org/tests/CodeSystem/unsupported.codesystem', 'Letter A')
      ];
      valueset.rules.push(rule);
      const myPackage = new Package();
      myPackage.add(valueset);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = new ExportableValueSetConceptComponentRule(true);
      expectedRule.concepts = [new FshCode('A', '$unsupported.codesystem', 'Letter A')];
      expect(valueset.rules).toContainEqual(expectedRule);
    });
  });
});
