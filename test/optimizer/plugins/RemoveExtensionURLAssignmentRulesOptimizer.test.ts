import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import {
  ExportableAssignmentRule,
  ExportableCardRule,
  ExportableConfiguration,
  ExportableContainsRule,
  ExportableExtension,
  ExportableFlagRule,
  ExportableProfile
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/RemoveExtensionURLAssignmentRules';
import { loggerSpy } from '../../helpers/loggerSpy';
import { loadTestDefinitions, stockLake } from '../../helpers';
import { MasterFisher } from '../../../src/utils';

describe('optimizer', () => {
  describe('#remove_extension_url_assignment_rules', () => {
    let fisher: MasterFisher;

    beforeAll(() => {
      const defs = loadTestDefinitions();
      const lake = stockLake();
      fisher = new MasterFisher(lake, defs);
    });

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

    it('should log an error when a URL assignment rule value does not match the extension sliceName', () => {
      const extension = new ExportableExtension('MyExtension');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      const cardRule = new ExportableCardRule('extension[foo]');
      cardRule.max = '1';
      containsRule.cardRules.push(cardRule);
      const flagRule = new ExportableFlagRule('extension[foo]');
      flagRule.mustSupport = true;
      const assignmentRule = new ExportableAssignmentRule('extension[foo].url');
      assignmentRule.value = 'bar';
      extension.rules = [containsRule, assignmentRule, flagRule];
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage);
      // The sliceName is replaced with the url rule, and other rules are updated as needed
      const expectedContainsRule = new ExportableContainsRule('extension');
      expectedContainsRule.items.push({ name: 'bar' });
      const expectedCardRule = new ExportableCardRule('extension[bar]');
      expectedCardRule.max = '1';
      expectedContainsRule.cardRules.push(expectedCardRule);
      const expectedFlagRule = new ExportableFlagRule('extension[bar]');
      expectedFlagRule.mustSupport = true;
      expect(extension.rules).toEqual([expectedContainsRule, expectedFlagRule]);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /has sliceName "foo" but "bar" is assigned/
      );
    });

    it('should log an error when a URL assignment rule is incorrectly used instead of type.profile', () => {
      const extension = new ExportableExtension('MyExtension');
      const containsRule = new ExportableContainsRule('extension');
      containsRule.items.push({ name: 'foo' });
      const assignmentRule = new ExportableAssignmentRule('extension[foo].url');
      assignmentRule.value = 'http://hl7.org/fhir/StructureDefinition/geolocation';
      extension.rules = [containsRule, assignmentRule];
      const myPackage = new Package();

      myPackage.add(extension);
      optimizer.optimize(myPackage, fisher);
      // The url rule is ignored, and the sliceName will be used
      expect(extension.rules).toEqual([containsRule]);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /refers to .*geolocation but does not set this value in type\.profile/
      );
    });
  });
});
