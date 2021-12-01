import path from 'path';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor';
import { ExportableInstance } from '../../../src/exportable';
import { MasterFisher } from '../../../src/utils';
import { loadTestDefinitions, stockLake } from '../../helpers';
import optimizer from '../../../src/optimizer/plugins/ResolveInstanceOfURLsOptimizer';

describe('optimizer', () => {
  describe('#resolve_parent_urls', () => {
    let fisher: MasterFisher;

    beforeAll(() => {
      const defs = loadTestDefinitions();
      const lake = stockLake(path.join(__dirname, 'fixtures', 'small-profile.json'));
      fisher = new MasterFisher(lake, defs);
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('resolve_instanceof_urls');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should replace an instanceOf url with the name of the resource', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'https://demo.org/StructureDefinition/Patient';
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher);
      expect(instance.instanceOf).toBe('Patient');
    });

    it('should alias the instanceOf url if the instanceOf is not found and alias is true', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'https://demo.org/StructureDefinition/MediumProfile';
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher, { alias: true });
      expect(instance.instanceOf).toBe('$MediumProfile');
      expect(myPackage.aliases).toEqual([
        { alias: '$MediumProfile', url: 'https://demo.org/StructureDefinition/MediumProfile' }
      ]);
    });

    it('should alias the instanceOf url if the instanceOf is not found and alias is undefined', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'https://demo.org/StructureDefinition/MediumProfile';
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher);
      expect(instance.instanceOf).toBe('$MediumProfile');
      expect(myPackage.aliases).toEqual([
        { alias: '$MediumProfile', url: 'https://demo.org/StructureDefinition/MediumProfile' }
      ]);
    });

    it('should not alias the instanceOf url if the instanceOf is not found and alias is false', () => {
      const instance = new ExportableInstance('Foo');
      instance.instanceOf = 'https://demo.org/StructureDefinition/MediumProfile';
      const myPackage = new Package();
      myPackage.add(instance);
      optimizer.optimize(myPackage, fisher, { alias: false });
      expect(instance.instanceOf).toBe('https://demo.org/StructureDefinition/MediumProfile');
      expect(myPackage.aliases).toHaveLength(0);
    });
  });
});
