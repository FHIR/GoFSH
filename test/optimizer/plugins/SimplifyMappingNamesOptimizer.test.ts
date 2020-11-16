import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import { ExportableMapping } from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/SimplifyMappingNamesOptimizer';

describe('optimizer', () => {
  describe('#simplify_mapping_names', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('simplify_mapping_names');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should make mapping names unique', () => {
      const mapping1 = new ExportableMapping('MyMapping');
      mapping1.source = 'MyPatient';
      mapping1.name = 'MyMapping-for-MyPatient';
      const mapping2 = new ExportableMapping('MyMapping');
      mapping2.source = 'MyObservation';
      mapping2.name = 'MyMapping-for-MyObservation';
      const mapping3 = new ExportableMapping('OtherMapping');
      mapping3.source = 'MyPatient';
      mapping3.name = 'OtherMapping-for-MyPatient';
      const myPackage = new Package();
      myPackage.add(mapping1);
      myPackage.add(mapping2);
      myPackage.add(mapping3);
      optimizer.optimize(myPackage);

      const expectedMapping1 = new ExportableMapping('MyMapping');
      expectedMapping1.source = 'MyPatient';
      expectedMapping1.name = 'MyMapping-for-MyPatient'; // No name simplification since it will conflict with other mappings
      const expectedMapping2 = new ExportableMapping('MyMapping');
      expectedMapping2.source = 'MyObservation';
      expectedMapping2.name = 'MyMapping-for-MyObservation'; // No name simplification since it will conflict with other mappings
      const expectedMapping3 = new ExportableMapping('OtherMapping');
      expectedMapping3.source = 'MyPatient';
      expectedMapping3.name = 'OtherMapping'; // Name simplification since it didn't conflict with any other mappings
      expect(myPackage.mappings).toEqual([expectedMapping1, expectedMapping2, expectedMapping3]);
    });
  });
});
