import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor';
import { ExportableAssignmentRule, ExportableInstance } from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/ResolveReferenceAssignmentsOptimizer';
import { AddReferenceKeywordOptimizer } from '../../../src/optimizer/plugins';
import { loadTestDefinitions, stockLake } from '../../helpers';
import { MasterFisher } from '../../../src/utils';
import { fshtypes } from 'fsh-sushi';

describe('optimizer', () => {
  describe('#resolve_reference_assignments_optimizer', () => {
    let fisher: MasterFisher;

    beforeAll(() => {
      const defs = loadTestDefinitions();
      const lake = stockLake();
      fisher = new MasterFisher(lake, defs);
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('resolve_reference_assignments_optimizer');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toEqual([AddReferenceKeywordOptimizer.name]);
    });

    it('should resolve a reference to another instance', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Observation';
      const referenceRule = new ExportableAssignmentRule('subject');
      referenceRule.value = new fshtypes.FshReference('Patient/Bar');
      instance.rules = [referenceRule];

      const referencedInstance = new ExportableInstance('Bar');
      referencedInstance.instanceOf = 'Patient';
      const myPackage = new Package();
      myPackage.add(instance);
      myPackage.add(referencedInstance);
      optimizer.optimize(myPackage, fisher);

      const expectedRule = new ExportableAssignmentRule('subject');
      expectedRule.value = new fshtypes.FshReference('Bar');
      expect(instance.rules).toEqual([expectedRule]);
    });

    it('should not resolve a reference that is not of the form <resourceType>/<id>', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Observation';
      const referenceRule = new ExportableAssignmentRule('subject');
      referenceRule.value = new fshtypes.FshReference('Patient/1/Bar');
      instance.rules = [referenceRule];

      const referencedInstance = new ExportableInstance('Bar');
      referencedInstance.instanceOf = 'Patient';
      const myPackage = new Package();
      myPackage.add(instance);
      myPackage.add(referencedInstance);
      optimizer.optimize(myPackage, fisher);

      expect(instance.rules).toEqual([referenceRule]);
    });

    it('should not resolve a reference to an instance which is not in the package', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Observation';
      const referenceRule = new ExportableAssignmentRule('subject');
      referenceRule.value = new fshtypes.FshReference('Patient/Bar');
      instance.rules = [referenceRule];

      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher);

      expect(instance.rules).toEqual([referenceRule]);
    });

    it('should not resolve a reference to an instance for which the resourceType cannot be verified', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Observation';
      const referenceRule = new ExportableAssignmentRule('subject');
      referenceRule.value = new fshtypes.FshReference('Nonsense/Bar');
      instance.rules = [referenceRule];

      const referencedInstance = new ExportableInstance('Bar');
      referencedInstance.instanceOf = 'Nonsense';
      const myPackage = new Package();
      myPackage.add(instance);
      myPackage.add(referencedInstance);
      optimizer.optimize(myPackage, fisher);

      // Even though the resourceType matches the instanceOf, we cannot find the definition of the instanceOf
      // so we don't replace the reference
      expect(instance.rules).toEqual([referenceRule]);
    });

    it('should not resolve a reference to an instance which only matches on resourceType', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'Observation';
      const referenceRule = new ExportableAssignmentRule('subject');
      referenceRule.value = new fshtypes.FshReference('Patient/Bar');
      instance.rules = [referenceRule];

      const referencedInstance = new ExportableInstance('Not-Bar');
      referencedInstance.instanceOf = 'Patient';
      const myPackage = new Package();
      myPackage.add(instance);
      myPackage.add(referencedInstance);
      optimizer.optimize(myPackage, fisher);

      expect(instance.rules).toEqual([referenceRule]);
    });
  });
});
