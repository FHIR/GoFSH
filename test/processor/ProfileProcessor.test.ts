import path from 'path';
import fs from 'fs-extra';
import { ProfileProcessor } from '../../src/processor';
import {
  ExportableCardRule,
  ExportableCaretValueRule,
  ExportableContainsRule,
  ExportableFixedValueRule,
  ExportableProfile
} from '../../src/exportable';
import '../helpers/loggerSpy'; // suppresses console logging
import { fhirdefs } from 'fsh-sushi';

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
      const result = ProfileProcessor.process(input, defs);
      expect(result).toBeInstanceOf(ExportableProfile);
      expect(result.name).toBe('SimpleProfile');
    });

    it('should convert a Profile with simple metadata', () => {
      // simple metadata fields are Id, Title, and Description
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input, defs);
      expect(result).toBeInstanceOf(ExportableProfile);
      expect(result.name).toBe('MyProfile');
      expect(result.id).toBe('my-profile');
      expect(result.title).toBe('My New Profile');
      expect(result.description).toBe('This is my new Profile. Thank you.');
    });

    it('should not convert a Profile without a name', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input, defs);
      expect(result).toBeUndefined();
    });
  });

  describe('#extractRules', () => {
    it('should convert a Profile with rules', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input, defs);
      const cardRule = new ExportableCardRule('valueString');
      cardRule.min = 1;
      const fixedValueRule = new ExportableFixedValueRule('valueString');
      fixedValueRule.fixedValue = 'foo';
      const caretRule = new ExportableCaretValueRule('valueString');
      caretRule.caretPath = 'short';
      caretRule.value = 'bar';
      expect(result.rules.length).toBe(3);
      expect(result.rules).toContainEqual<ExportableCardRule>(cardRule);
      expect(result.rules).toContainEqual<ExportableFixedValueRule>(fixedValueRule);
      expect(result.rules).toContainEqual<ExportableCaretValueRule>(caretRule);
    });

    it('should convert a Profile with a new slice', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'new-slice-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input, defs);
      const containsRule = new ExportableContainsRule('category');
      containsRule.items = [{ name: 'Foo' }];
      const cardRule = new ExportableCardRule('category[Foo]');
      cardRule.min = 1;
      cardRule.max = '*';
      containsRule.cardRules.push(cardRule);
      expect(result.rules).toEqual([containsRule]);
    });

    it('should convert a Profile with an existing slice', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'existing-slice-profile.json'), 'utf-8')
      );
      const result = ProfileProcessor.process(input, defs);
      const cardRule = new ExportableCardRule('category[VSCat]');
      cardRule.min = 1;
      cardRule.max = '1';
      expect(result.rules).toEqual([cardRule]);
    });
  });

  it('should convert a profile that has a baseDefinition', () => {
    // the baseDefinition field defines a Profile's Parent
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'big-profile.json'), 'utf-8')
    );
    const result = ProfileProcessor.process(input, defs);
    expect(result).toBeInstanceOf(ExportableProfile);
    expect(result.name).toBe('BigProfile');
    expect(result.parent).toBe('https://demo.org/StructureDefinition/SmallProfile');
  });
});
