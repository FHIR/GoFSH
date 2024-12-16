import path from 'path';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor';
import { MasterFisher } from '../../../src/utils';
import { loadTestDefinitions, stockLake } from '../../helpers';
import optimizer from '../../../src/optimizer/plugins/ResolveContextURLsOptimizer';
import { ExportableExtension } from '../../../src/exportable';

describe('optimizer', () => {
  describe('#resolve_context_urls', () => {
    let fisher: MasterFisher;

    beforeAll(async () => {
      const defs = await loadTestDefinitions();
      const lake = await stockLake(
        path.join(__dirname, 'fixtures', 'small-extension.json'),
        path.join(__dirname, 'fixtures', 'small-profile.json')
      );
      fisher = new MasterFisher(lake, defs);
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('resolve_context_urls');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should replace an unquoted context with an extension name when the context value is the URL of a known extension', () => {
      const extension = new ExportableExtension('MyExtension');
      extension.contexts = [
        {
          isQuoted: false,
          value: 'https://demo.org/StructureDefinition/SmallExtension'
        }
      ];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage, fisher);
      expect(extension.contexts).toEqual([
        {
          isQuoted: false,
          value: 'SmallExtension'
        }
      ]);
    });

    it('should replace an unquoted context with a resource name and element path when the context value is a URL of a known resource with a path', () => {
      const extension = new ExportableExtension('MyExtension');
      extension.contexts = [
        {
          isQuoted: false,
          value: 'https://demo.org/StructureDefinition/SmallPatient#name'
        }
      ];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage, fisher);
      expect(extension.contexts).toEqual([
        {
          isQuoted: false,
          value: 'SmallPatient.name'
        }
      ]);
    });

    it('should replace an unquoted context with a resource name and no path when the context value is a URL of a known resource with no path', () => {
      const extension = new ExportableExtension('MyExtension');
      extension.contexts = [
        {
          isQuoted: false,
          value: 'https://demo.org/StructureDefinition/SmallPatient'
        }
      ];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage, fisher);
      expect(extension.contexts).toEqual([
        {
          isQuoted: false,
          value: 'SmallPatient'
        }
      ]);
    });

    it('should replace an unquoted context with an alias when the context value is a URL of an unknown resource', () => {
      const extension = new ExportableExtension('MyExtension');
      extension.contexts = [
        {
          isQuoted: false,
          value: 'https://demo.org/StructureDefinition/MysteriousExtension'
        }
      ];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage, fisher);
      expect(extension.contexts).toEqual([
        {
          isQuoted: false,
          value: '$MysteriousExtension'
        }
      ]);
      expect(myPackage.aliases).toEqual([
        {
          alias: '$MysteriousExtension',
          url: 'https://demo.org/StructureDefinition/MysteriousExtension'
        }
      ]);
    });

    it('should replace an unquoted context with an alias and path when the context value is a URL of an unknown resource with a path', () => {
      const extension = new ExportableExtension('MyExtension');
      extension.contexts = [
        {
          isQuoted: false,
          value: 'https://demo.org/StructureDefinition/UnknownObservation#method'
        }
      ];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage, fisher);
      expect(extension.contexts).toEqual([
        {
          isQuoted: false,
          value: '$UnknownObservation#method'
        }
      ]);
      expect(myPackage.aliases).toEqual([
        {
          alias: '$UnknownObservation',
          url: 'https://demo.org/StructureDefinition/UnknownObservation'
        }
      ]);
    });

    it('should not change an unquoted context when the context value is a URL of an unknown resource with no path and the alias option is false', () => {
      const extension = new ExportableExtension('MyExtension');
      extension.contexts = [
        {
          isQuoted: false,
          value: 'https://demo.org/StructureDefinition/MysteriousExtension'
        }
      ];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage, fisher, { alias: false });
      expect(extension.contexts).toEqual([
        {
          isQuoted: false,
          value: 'https://demo.org/StructureDefinition/MysteriousExtension'
        }
      ]);
      expect(myPackage.aliases).toEqual([]);
    });

    it('should not change an unquoted context when the context value is a URL of an unknown resource with a path and the alias option is false', () => {
      const extension = new ExportableExtension('MyExtension');
      extension.contexts = [
        {
          isQuoted: false,
          value: 'https://demo.org/StructureDefinition/UnknownObservation#Observation.method'
        }
      ];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage, fisher, { alias: false });
      expect(extension.contexts).toEqual([
        {
          isQuoted: false,
          value: 'https://demo.org/StructureDefinition/UnknownObservation#Observation.method'
        }
      ]);
      expect(myPackage.aliases).toEqual([]);
    });

    it('should not change a quoted context', () => {
      const extension = new ExportableExtension('MyExtension');
      extension.contexts = [
        {
          isQuoted: true,
          value: 'some.fhirpath("expression")'
        }
      ];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage, fisher);
      expect(extension.contexts).toEqual([
        {
          isQuoted: true,
          value: 'some.fhirpath("expression")'
        }
      ]);
    });
  });
});
