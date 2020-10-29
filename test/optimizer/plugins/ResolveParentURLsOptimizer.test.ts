import path from 'path';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { fhirdefs } from 'fsh-sushi';
import { Package } from '../../../src/processor/Package';
import { ExportableExtension, ExportableProfile } from '../../../src/exportable';
import { FHIRProcessor } from '../../../src/processor/FHIRProcessor';
import optimizer from '../../../src/optimizer/plugins/ResolveParentURLsOptimizer';

describe('optimizer', () => {
  describe('#resolve_parent_urls', () => {
    let processor: FHIRProcessor;

    beforeAll(() => {
      processor = new FHIRProcessor(new fhirdefs.FHIRDefinitions());
      // add a StructureDefinition to the processor
      processor.register(path.join(__dirname, 'fixtures', 'small-profile.json'));
      processor.register(path.join(__dirname, 'fixtures', 'small-extension.json'));
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('resolve_parent_urls');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should replace a profile parent url with the name of the parent', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'https://demo.org/StructureDefinition/Patient';
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, processor);
      expect(profile.parent).toBe('Patient');
    });

    it('should replace an extension parent url with the name of the parent', () => {
      const extension = new ExportableExtension('ExtraExtension');
      extension.parent = 'https://demo.org/StructureDefinition/SmallExtension';
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage, processor);
      expect(extension.parent).toBe('SmallExtension');
    });

    it('should replace a profile parent url with the name of a core FHIR resource', () => {
      const profile = new ExportableProfile('MyObservation');
      profile.parent = 'http://hl7.org/fhir/StructureDefinition/Observation';
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, processor);
      expect(profile.parent).toBe('Observation');
    });

    it('should replace an extension parent url with the name of a core FHIR resource', () => {
      const extension = new ExportableExtension('MyNewExtension');
      extension.parent = 'http://hl7.org/fhir/StructureDefinition/allergyintolerance-certainty';
      const myPackage = new Package();
      myPackage.add(extension);
      optimizer.optimize(myPackage, processor);
      expect(extension.parent).toBe('allergyintolerance-certainty');
    });

    it('should not replace a parent url with the name of a core FHIR resource if it shares a name with a local StructureDefinition', () => {
      const profile = new ExportableProfile('MyPatient');
      profile.parent = 'http://hl7.org/fhir/StructureDefinition/Patient';
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, processor);
      expect(profile.parent).toBe('http://hl7.org/fhir/StructureDefinition/Patient');
    });

    it('should not change the profile parent url if the parent is not found', () => {
      const profile = new ExportableProfile('ExtraProfile');
      profile.parent = 'https://demo.org/StructureDefinition/MediumProfile';
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, processor);
      expect(profile.parent).toBe('https://demo.org/StructureDefinition/MediumProfile');
    });
  });
});
