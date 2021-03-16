import path from 'path';
import { cloneDeep } from 'lodash';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor';
import { ExportableAssignmentRule, ExportableInstance } from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/AddReferenceKeywordOptimizer';
import { loadTestDefinitions, stockLake } from '../../helpers';
import { MasterFisher } from '../../../src/utils';
import { fshtypes } from 'fsh-sushi';

describe('optimizer', () => {
  describe('#add_reference_keyword_optimizer', () => {
    let fisher: MasterFisher;

    beforeAll(() => {
      const defs = loadTestDefinitions();
      const lake = stockLake();
      fisher = new MasterFisher(lake, defs);
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('add_reference_keyword_optimizer');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('add the Reference keyword on a reference rule', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Patient';
      const referenceRule = new ExportableAssignmentRule('generalPractitioner.reference');
      referenceRule.value = 'Practitioner/Bar';
      instance.rules = [referenceRule];
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = cloneDeep(referenceRule);
      expectedRule.value = new fshtypes.FshReference('Practitioner/Bar');
      expect(instance.rules).toEqual([expectedRule]);
    });

    it('add the Reference keyword on a reference rule and find a corresponding display', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Patient';
      const referenceRule = new ExportableAssignmentRule('generalPractitioner.reference');
      referenceRule.value = 'Practitioner/Bar';
      const displayRule = new ExportableAssignmentRule('generalPractitioner.display');
      displayRule.value = 'Display value';
      instance.rules = [referenceRule, displayRule];
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = cloneDeep(referenceRule);
      expectedRule.value = new fshtypes.FshReference('Practitioner/Bar');
      expectedRule.value.display = 'Display value';
      // Note the display rule is removed
      expect(instance.rules).toEqual([expectedRule]);
    });

    it('add the Reference keyword on multiple reference rules and find the corresponding displays', () => {
      const instance = new ExportableInstance('Foo');

      instance.instanceOf = 'Patient';
      const referenceRule1 = new ExportableAssignmentRule('generalPractitioner[0].reference');
      referenceRule1.value = 'Practitioner/Bar1';
      const displayRule1 = new ExportableAssignmentRule('generalPractitioner[0].display');
      displayRule1.value = 'Display value 1';

      const referenceRule2 = new ExportableAssignmentRule('generalPractitioner[1].reference');
      referenceRule2.value = 'Practitioner/Bar2';
      const displayRule2 = new ExportableAssignmentRule('generalPractitioner[1].display');
      displayRule2.value = 'Display value 2';

      // Throw another rule in there to make sure the right rules are being removed
      const nameRule = new ExportableAssignmentRule('name.family');
      nameRule.value = 'FooPerson';

      instance.rules = [referenceRule1, displayRule1, nameRule, displayRule2, referenceRule2];
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher);

      const expectedRule1 = cloneDeep(referenceRule1);
      expectedRule1.value = new fshtypes.FshReference('Practitioner/Bar1');
      expectedRule1.value.display = 'Display value 1';

      const expectedRule2 = cloneDeep(referenceRule2);
      expectedRule2.value = new fshtypes.FshReference('Practitioner/Bar2');
      expectedRule2.value.display = 'Display value 2';

      expect(instance.rules).toEqual([expectedRule1, nameRule, expectedRule2]);
    });

    it('not add the Reference keyword on a reference rule when the instanceOf type cannot be found', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'http://example.org/StructureDefinition/my-patient-profile';
      const referenceRule = new ExportableAssignmentRule('generalPractitioner.reference');
      referenceRule.value = 'Practitioner/Bar';
      instance.rules = [referenceRule];
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher);

      // Rule is unchanged
      expect(instance.rules).toEqual([referenceRule]);
    });

    it('not add the Reference keyword on a reference rule when the type cannot be verified', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Patient';
      const referenceRule = new ExportableAssignmentRule('nonsense.reference');
      referenceRule.value = 'Practitioner/Bar';
      instance.rules = [referenceRule];
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher);

      // Rule is unchanged
      expect(instance.rules).toEqual([referenceRule]);
    });
  });
});
