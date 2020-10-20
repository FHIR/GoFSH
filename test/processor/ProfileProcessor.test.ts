import path from 'path';
import fs from 'fs-extra';
import { ProfileProcessor } from '../../src/processor';
import {
  ExportableCardRule,
  ExportableCaretValueRule,
  ExportableContainsRule,
  ExportableObeysRule,
  ExportableInvariant,
  ExportableAssignmentRule,
  ExportableProfile,
  ExportableMapping,
  ExportableMappingRule
} from '../../src/exportable';
import '../helpers/loggerSpy'; // suppresses console logging
import { fhirdefs, fshtypes } from 'fsh-sushi';

describe('ProfileProcessor', () => {
  let defs: fhirdefs.FHIRDefinitions;

  beforeAll(() => {
    defs = new fhirdefs.FHIRDefinitions();
    fhirdefs.loadFromPath(path.join(__dirname, '..', 'utils', 'testdefs'), 'testPackage', defs);
  });
  describe('#extractKeywords', () => {
    it('should convert the simplest Profile', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-profile.json'), 'utf-8')
      );
      const expectedProfile = new ExportableProfile('SimpleProfile');
      const result = ProfileProcessor.process(input, defs);

      expect(result).toContainEqual<ExportableProfile>(expectedProfile);
    });

    it('should convert a Profile with simple metadata', () => {
      // simple metadata fields are Id, Title, and Description
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-profile.json'), 'utf-8')
      );
      const expectedProfile = new ExportableProfile('MyProfile');
      expectedProfile.id = 'my-profile';
      expectedProfile.title = 'My New Profile';
      expectedProfile.description = 'This is my new Profile. Thank you.';
      const result = ProfileProcessor.process(input, defs);

      expect(result).toContainEqual<ExportableProfile>(expectedProfile);
    });

    it('should not convert a Profile without a name', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input, defs);

      expect(result).toHaveLength(0);
    });
  });

  describe('#extractRules', () => {
    it('should convert a Profile with rules', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input, defs);
      const profile = result.find(
        resource => resource instanceof ExportableProfile
      ) as ExportableProfile;
      const cardRule = new ExportableCardRule('valueString');
      cardRule.min = 1;
      const assignmentRule = new ExportableAssignmentRule('valueString');
      assignmentRule.value = 'foo';
      const caretRule = new ExportableCaretValueRule('valueString');
      caretRule.caretPath = 'short';
      caretRule.value = 'bar';
      const obeysRule = new ExportableObeysRule('note');
      obeysRule.keys = ['myo-1'];

      expect(profile.rules.length).toBe(4);
      expect(profile.rules).toContainEqual<ExportableCardRule>(cardRule);
      expect(profile.rules).toContainEqual<ExportableAssignmentRule>(assignmentRule);
      expect(profile.rules).toContainEqual<ExportableCaretValueRule>(caretRule);
      expect(profile.rules).toContainEqual<ExportableObeysRule>(obeysRule);
    });

    it('should convert a Profile with a new slice', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'new-slice-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input, defs);
      const profile = result.find(
        resource => resource instanceof ExportableProfile
      ) as ExportableProfile;
      const containsRule = new ExportableContainsRule('category');
      containsRule.items = [{ name: 'Foo' }];
      const cardRule = new ExportableCardRule('category[Foo]');
      cardRule.min = 1;
      cardRule.max = '*';
      containsRule.cardRules.push(cardRule);

      expect(profile.rules).toEqual([containsRule]);
    });

    it('should convert a Profile with an existing slice', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'existing-slice-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input, defs);
      const profile = result.find(
        resource => resource instanceof ExportableProfile
      ) as ExportableProfile;
      const cardRule = new ExportableCardRule('category[VSCat]');
      cardRule.min = 1;
      cardRule.max = '1';

      expect(profile.rules).toEqual([cardRule]);
    });
  });

  describe('#extractInvariants', () => {
    it('should convert a profile with an invariant', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input, defs);
      const invariants = result.filter(resource => resource instanceof ExportableInvariant);
      const weatherInvariant = new ExportableInvariant('myo-1');
      weatherInvariant.description = 'SHALL include the weather.';
      weatherInvariant.severity = new fshtypes.FshCode('warning');

      expect(invariants).toHaveLength(1);
      expect(invariants).toContainEqual(weatherInvariant);
    });

    it('should create an invariant for the first instance of a constraint key and caret value rules for other instances of that constraint key', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'reused-invariant-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input, defs);
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
  });

  describe('#extractMappings', () => {
    it('should convert a profile with a mapping', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input, defs);
      const mappings = result.filter(resource => resource instanceof ExportableMapping);
      const map = new ExportableMapping('MyMapping');
      map.source = 'MyObservation';
      map.target = 'http://example.org/important';
      map.title = 'My Mapping';
      map.description = 'This is important';
      const mapRule1 = new ExportableMappingRule('');
      mapRule1.map = 'Observation';
      mapRule1.comment = 'This is top level';
      mapRule1.language = new fshtypes.FshCode('top');
      const mapRule2 = new ExportableMappingRule('focus');
      mapRule2.map = 'Observation.otherFocus';
      mapRule2.comment = 'This is a focused comment';
      mapRule2.language = new fshtypes.FshCode('test');
      map.rules.push(mapRule1, mapRule2);

      expect(mappings).toHaveLength(1);
      expect(mappings).toContainEqual(map);
    });

    it('should only create Mappings for mappings that are not on the parent definition', () => {
      const input = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, 'fixtures', 'mapping-with-parent-profile.json'),
          'utf-8'
        )
      );
      const result = ProfileProcessor.process(input, defs);
      const mappings = result.filter(resource => resource instanceof ExportableMapping);
      expect(mappings).toHaveLength(1); // Other mappings from base Observation are not exported
    });
  });

  it('should convert a profile that has a baseDefinition', () => {
    // the baseDefinition field defines a Profile's Parent
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'big-profile.json'), 'utf-8')
    );
    const [profile] = ProfileProcessor.process(input, defs);
    expect(profile).toBeInstanceOf(ExportableProfile);
    expect(profile.name).toBe('BigProfile');
    expect(profile.parent).toBe('https://demo.org/StructureDefinition/SmallProfile');
  });
});
