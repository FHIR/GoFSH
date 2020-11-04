import path from 'path';
import fs from 'fs-extra';
import { fhirdefs, fshtypes } from 'fsh-sushi';
import {
  StructureDefinitionProcessor,
  ProcessableElementDefinition,
  ProcessableStructureDefinition
} from '../../src/processor';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableCardRule,
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableObeysRule,
  ExportableContainsRule,
  ExportableInvariant
} from '../../src/exportable';
import '../helpers/loggerSpy'; // suppresses console logging
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';

describe('StructureDefinitionProcessor', () => {
  let defs: fhirdefs.FHIRDefinitions;

  beforeAll(() => {
    defs = loadTestDefinitions();
  });

  describe('#process', () => {
    it('should convert the simplest Profile', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-profile.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ExportableProfile);
      expect(result[0].name).toBe('SimpleProfile');
    });

    it('should convert the simplest Extension', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-extension.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ExportableExtension);
      expect(result[0].name).toBe('SimpleExtension');
    });

    it('should convert a profile that has a baseDefinition', () => {
      // the baseDefinition field defines a Profile's Parent
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'big-profile.json'), 'utf-8')
      );
      const [profile] = StructureDefinitionProcessor.process(input, defs);

      expect(profile).toBeInstanceOf(ExportableProfile);
      expect(profile.name).toBe('BigProfile');
      expect(profile.parent).toBe('https://demo.org/StructureDefinition/SmallProfile');
    });

    it('should convert a profile with an invariant', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-profile.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs);
      const profiles = result.filter(resource => resource instanceof ExportableProfile);
      const invariants = result.filter(resource => resource instanceof ExportableInvariant);

      expect(profiles).toHaveLength(1);
      expect(invariants).toHaveLength(1);
    });

    it('should create an invariant for the first instance of a constraint key and caret value rules for other instances of that constraint key', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'reused-invariant-profile.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs);
      const invariants = result.filter(resource => resource instanceof ExportableInvariant);
      const profile = result.find(
        resource => resource instanceof ExportableProfile
      ) as ExportableProfile;
      const onlyInvariant = new ExportableInvariant('myo-1');
      onlyInvariant.description = 'First appearance of invariant with key myo-1.';
      onlyInvariant.severity = new fshtypes.FshCode('warning');
      const constraintKey = new ExportableCaretValueRule('method');
      constraintKey.caretPath = 'constraint[0].key';
      constraintKey.value = 'myo-1';
      const constraintSeverity = new ExportableCaretValueRule('method');
      constraintSeverity.caretPath = 'constraint[0].severity';
      constraintSeverity.value = new fshtypes.FshCode('warning');
      const constraintHuman = new ExportableCaretValueRule('method');
      constraintHuman.caretPath = 'constraint[0].human';
      constraintHuman.value = 'Second appearance of invariant with key myo-1.';

      expect(invariants).toHaveLength(1);
      expect(invariants).toContainEqual(onlyInvariant);
      expect(profile.rules).toContainEqual(constraintKey);
      expect(profile.rules).toContainEqual(constraintSeverity);
      expect(profile.rules).toContainEqual(constraintHuman);
    });

    it('should not convert a Profile without a name', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-profile.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs);

      expect(result).toHaveLength(0);
    });

    it('should not convert an Extension without a name', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-extension.json'), 'utf-8')
      );
      const result = StructureDefinitionProcessor.process(input, defs);

      expect(result).toHaveLength(0);
    });
  });

  describe('#extractKeywords', () => {
    it('should get keywords for a Profile with simple metadata', () => {
      // simple metadata fields are Id, Title, and Description
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-profile.json'), 'utf-8')
      );
      const workingProfile = new ExportableProfile(input.name);
      StructureDefinitionProcessor.extractKeywords(input, workingProfile);

      expect(workingProfile.id).toBe('my-profile');
      expect(workingProfile.title).toBe('My New Profile');
      expect(workingProfile.description).toBe('This is my new Profile. Thank you.');
    });

    it('should get keywords for an Extension with simple metadata', () => {
      // simple metadata fields are Id, Title, and Description
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-extension.json'), 'utf-8')
      );
      const workingExtension = new ExportableExtension(input.name);
      StructureDefinitionProcessor.extractKeywords(input, workingExtension);

      expect(workingExtension.id).toBe('my-extension');
      expect(workingExtension.title).toBe('My New Extension');
      expect(workingExtension.description).toBe('This is my new Extension. Thank you.');
    });
  });

  describe('#extractRules', () => {
    it('should add rules to a Profile', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-profile.json'), 'utf-8')
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      // these paths would be processed by the InvariantExtractor
      elements[2].processedPaths.push(
        'constraint[0].key',
        'constraint[0].human',
        'constraint[0].severity'
      );
      // these paths would be processed by the MappingExtractor
      elements[0].processedPaths.push(
        'mapping[0].identity',
        'mapping[0].map',
        'mapping[0].comment',
        'mapping[0].language'
      );
      elements[3].processedPaths.push(
        'mapping[0].identity',
        'mapping[0].map',
        'mapping[0].comment',
        'mapping[0].language'
      );
      const workingProfile = new ExportableProfile('MyObservation');
      StructureDefinitionProcessor.extractRules(input, elements, workingProfile, defs);
      const cardRule = new ExportableCardRule('valueString');
      cardRule.min = 1;
      const assignmentRule = new ExportableAssignmentRule('valueString');
      assignmentRule.value = 'foo';
      const caretRule = new ExportableCaretValueRule('valueString');
      caretRule.caretPath = 'short';
      caretRule.value = 'bar';
      const obeysRule = new ExportableObeysRule('note');
      obeysRule.keys = ['myo-1'];

      expect(workingProfile.rules.length).toBe(4);
      expect(workingProfile.rules).toContainEqual<ExportableCardRule>(cardRule);
      expect(workingProfile.rules).toContainEqual<ExportableAssignmentRule>(assignmentRule);
      expect(workingProfile.rules).toContainEqual<ExportableCaretValueRule>(caretRule);
      expect(workingProfile.rules).toContainEqual<ExportableObeysRule>(obeysRule);
    });

    it('should add rules to an Extension', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-extension.json'), 'utf-8')
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      const workingExtension = new ExportableExtension('MyExtension');
      StructureDefinitionProcessor.extractRules(input, elements, workingExtension, defs);
      const assignmentRule = new ExportableAssignmentRule('url');
      assignmentRule.value = 'https://go.fsh/StructureDefinition/my-extension';
      assignmentRule.exactly = true;

      expect(workingExtension.rules.length).toBe(1);
      expect(workingExtension.rules).toContainEqual<ExportableAssignmentRule>(assignmentRule);
    });

    it('should add rules to a Profile with a new slice', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'new-slice-profile.json'), 'utf-8')
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      const workingProfile = new ExportableProfile('MyObservation');
      StructureDefinitionProcessor.extractRules(input, elements, workingProfile, defs);
      const containsRule = new ExportableContainsRule('category');
      containsRule.items = [{ name: 'Foo' }];
      const cardRule = new ExportableCardRule('category[Foo]');
      cardRule.min = 1;
      cardRule.max = '*';
      containsRule.cardRules.push(cardRule);

      expect(workingProfile.rules).toEqual([containsRule]);
    });

    it('should add rules to a Profile with an existing slice', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'existing-slice-profile.json'), 'utf-8')
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      const workingProfile = new ExportableProfile('MyObservation');
      StructureDefinitionProcessor.extractRules(input, elements, workingProfile, defs);
      const cardRule = new ExportableCardRule('category[VSCat]');
      cardRule.min = 1;
      cardRule.max = '1';

      expect(workingProfile.rules).toEqual([cardRule]);
    });
  });

  describe('#extractInvariants', () => {
    it('should return a list containing the invariants for all elements', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, '..', 'extractor', 'fixtures', 'obeys-profile.json'),
          'utf-8'
        )
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      const result = StructureDefinitionProcessor.extractInvariants(elements, []);

      expect(result).toHaveLength(4);
    });
  });

  describe('#extractMappings', () => {
    it('should convert a profile with a mapping', () => {
      const input: ProcessableStructureDefinition = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-profile.json'), 'utf-8')
      );
      const elements =
        input.differential?.element?.map(rawElement => {
          return ProcessableElementDefinition.fromJSON(rawElement, false);
        }) ?? [];
      const mappings = StructureDefinitionProcessor.extractMappings(elements, input, defs);

      expect(mappings).toHaveLength(1);
    });
  });
});
