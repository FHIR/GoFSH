import path from 'path';
import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor';
import { ExportableOnlyRule, ExportableProfile } from '../../../src/exportable';
import { MasterFisher } from '../../../src/utils';
import { loadTestDefinitions, stockLake } from '../../helpers';
import optimizer from '../../../src/optimizer/plugins/ResolveOnlyRuleURLsOptimizer';

describe('optimizer', () => {
  describe('#resolve_only_rule_urls', () => {
    let fisher: MasterFisher;

    beforeAll(() => {
      const defs = loadTestDefinitions();
      const lake = stockLake(path.join(__dirname, 'fixtures', 'small-profile.json'));
      fisher = new MasterFisher(lake, defs);
    });

    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('resolve_only_rule_urls');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should replace an only rule type url with the name of a local StructureDefinition', () => {
      const profile = new ExportableProfile('MyObservation');
      const onlySubject = new ExportableOnlyRule('subject');
      onlySubject.types = [
        {
          type: 'https://demo.org/StructureDefinition/Patient',
          isReference: true
        }
      ];

      profile.rules.push(onlySubject);
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher);

      const expectedSubject = new ExportableOnlyRule('subject');
      expectedSubject.types = [
        {
          type: 'Patient',
          isReference: true
        }
      ];
      expect(profile.rules).toContainEqual(expectedSubject);
    });

    it('should replace an only rule type url with the name of a core FHIR resource', () => {
      const profile = new ExportableProfile('MyObservation');
      const onlySubject = new ExportableOnlyRule('subject');
      onlySubject.types = [
        {
          type: 'http://hl7.org/fhir/StructureDefinition/Group',
          isReference: true
        }
      ];
      const onlyValue = new ExportableOnlyRule('extension[something].value[x]');
      onlyValue.types = [
        {
          type: 'http://hl7.org/fhir/StructureDefinition/Device'
        },
        {
          type: 'http://hl7.org/fhir/StructureDefinition/Medication'
        },
        {
          type: 'http://example.org/fhir/StructureDefinition/CustomComponent'
        }
      ];

      profile.rules.push(onlySubject, onlyValue);
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher);

      const expectedSubject = new ExportableOnlyRule('subject');
      expectedSubject.types = [
        {
          type: 'Group',
          isReference: true
        }
      ];
      const expectedValue = new ExportableOnlyRule('extension[something].value[x]');
      expectedValue.types = [
        {
          type: 'Device'
        },
        {
          type: 'Medication'
        },
        {
          type: 'http://example.org/fhir/StructureDefinition/CustomComponent'
        }
      ];
      expect(profile.rules).toContainEqual(expectedSubject);
      expect(profile.rules).toContainEqual(expectedValue);
    });

    it('should not replace an only rule type url with the name of a core FHIR resource if it shares a name with a local StructureDefinition', () => {
      const profile = new ExportableProfile('MyObservation');
      const onlySubject = new ExportableOnlyRule('subject');
      onlySubject.types = [
        {
          type: 'http://hl7.org/fhir/StructureDefinition/Patient',
          isReference: true
        }
      ];

      profile.rules.push(onlySubject);
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage, fisher);

      const expectedSubject = new ExportableOnlyRule('subject');
      expectedSubject.types = [
        {
          type: 'http://hl7.org/fhir/StructureDefinition/Patient',
          isReference: true
        }
      ];
      expect(profile.rules).toContainEqual(expectedSubject);
    });
  });
});
