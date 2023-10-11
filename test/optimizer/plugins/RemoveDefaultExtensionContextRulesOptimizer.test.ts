import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import { ExportableExtension } from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/RemoveDefaultExtensionContextRulesOptimizer';

describe('optimizer', () => {
  describe('#remove_default_extension_context_rules', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('remove_default_extension_context_rules');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should remove default context from extensions', () => {
      const extension = new ExportableExtension('ExtraExtension');
      extension.contexts = [{ value: 'Element', isQuoted: false }];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage);
      expect(extension.contexts).toHaveLength(0);
    });

    it('should not remove non-default context from extensions', () => {
      const extension = new ExportableExtension('ExtraExtension');
      extension.contexts = [{ value: 'Observation', isQuoted: false }];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage);
      expect(extension.contexts).toHaveLength(1);
    });

    it('should not remove default context from extensions when there is more than one context', () => {
      const extension = new ExportableExtension('ExtraExtension');
      extension.contexts = [
        { value: 'Element', isQuoted: false },
        { value: 'Observation', isQuoted: false }
      ];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage);
      expect(extension.contexts).toHaveLength(2);
    });
  });
});
