import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import {
  ExportableAssignmentRule,
  ExportableConfiguration,
  ExportableContainsRule,
  ExportableExtension,
  ExportableFlagRule,
  ExportableProfile
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/RemoveExtensionURLAssignmentRules';

describe('optimizer', () => {
  describe('#remove_extension_url_assignment_rules', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('remove_extension_url_assignment_rules');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should remove URL assignment rules on inline extensions on an extension', () => {
      const extension = new ExportableExtension('MyExtension');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      const assignmentRule = new ExportableAssignmentRule('extension[foo].url');
      assignmentRule.value = 'foo';
      extension.rules = [containsRule, assignmentRule];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage);
      expect(extension.rules).toEqual([containsRule]);
    });

    it('should remove URL assignment rules on inline extensions on a modifierExtension', () => {
      const extension = new ExportableExtension('MyExtension');
      const containsRule = new ExportableContainsRule('modifierExtension');
      containsRule.items.push({ name: 'foo' });
      const assignmentRule = new ExportableAssignmentRule('modifierExtension[foo].url');
      assignmentRule.value = 'foo';
      extension.rules = [containsRule, assignmentRule];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage);
      expect(extension.rules).toEqual([containsRule]);
    });

    it('should remove URL assignment rules on inline extensions on a profile', () => {
      // Note that inline extensions on a profile are poor form, SUSHI allows it, but it is not valid
      // FHIR and the IG Publisher will get mad
      const profile = new ExportableProfile('MyProfile');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      const assignmentRule = new ExportableAssignmentRule('extension[foo].url');
      assignmentRule.value = 'foo';
      profile.rules = [containsRule, assignmentRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([containsRule]);
    });

    it('should not remove other URL rules on inline extensions on a profile', () => {
      const profile = new ExportableProfile('MyProfile');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      const flagRule = new ExportableFlagRule('extension[foo].url');
      flagRule.mustSupport = true;
      profile.rules = [containsRule, flagRule];
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toEqual([containsRule, flagRule]);
    });

    it('should remove a URL assignment rule on an extension only when that URL matches the canonical', () => {
      const extension = new ExportableExtension('MyExtension');
      const assignmentRule = new ExportableAssignmentRule('url');
      assignmentRule.value = 'http://example.org/StructureDefinition/MyExtension';
      extension.rules = [assignmentRule];
      const myPackage = new Package();
      myPackage.configuration = new ExportableConfiguration({
        fhirVersion: ['4.0.1'],
        canonical: 'http://example.org'
      });
      myPackage.add(extension);
      optimizer.optimize(myPackage);
      expect(extension.rules).toEqual([]);
    });

    it('should not remove a URL assignment rule on an extension when that URL does not match the canonical', () => {
      const extension = new ExportableExtension('MyExtension');
      const assignmentRule = new ExportableAssignmentRule('url');
      assignmentRule.value = 'http://example.org/StructureDefinition/MyExtension';
      extension.rules = [assignmentRule];
      const myPackage = new Package();
      myPackage.configuration = new ExportableConfiguration({
        fhirVersion: ['4.0.1'],
        canonical: 'http://other-canonical.org'
      });
      myPackage.add(extension);
      optimizer.optimize(myPackage);
      expect(extension.rules).toEqual([assignmentRule]);
    });

    it('should not remove a URL assignment rule on an extension if there is no configuration', () => {
      const extension = new ExportableExtension('MyExtension');
      const assignmentRule = new ExportableAssignmentRule('url');
      assignmentRule.value = 'http://example.org/StructureDefinition/MyExtension';
      extension.rules = [assignmentRule];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage);
      expect(extension.rules).toEqual([assignmentRule]);
    });
  });
});
