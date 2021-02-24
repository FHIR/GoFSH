import path from 'path';
import fs from 'fs-extra';
import { fhirdefs, fshtypes } from 'fsh-sushi';
import { CodeSystemProcessor } from '../../src/processor';
import {
  ExportableCodeSystem,
  ExportableConceptRule,
  ExportableCaretValueRule
} from '../../src/exportable';
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';
import { loggerSpy } from '../helpers/loggerSpy';

describe('CodeSystemProcessor', () => {
  let defs: fhirdefs.FHIRDefinitions;
  let config: fshtypes.Configuration;

  beforeAll(() => {
    defs = loadTestDefinitions();
    config = {
      canonical: 'http://example.org/tests',
      fhirVersion: ['4.0.1']
    };
  });

  beforeEach(() => {
    loggerSpy.reset();
  });

  describe('#process', () => {
    it('should convert the simplest CodeSystem', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-codesystem.json'), 'utf-8')
      );
      const result = CodeSystemProcessor.process(input, defs, config);
      expect(result).toBeInstanceOf(ExportableCodeSystem);
      expect(result.name).toBe('SimpleCodeSystem');
    });

    it('should not convert a CodeSystem without a name or id', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-codesystem.json'), 'utf-8')
      );
      const result = CodeSystemProcessor.process(input, defs, config);
      expect(result).toBeUndefined();
    });

    it('should convert a CodeSystem without a name but with an id', () => {
      const input = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, 'fixtures', 'nameless-codesystem-with-id.json'),
          'utf-8'
        )
      );
      const result = CodeSystemProcessor.process(input, defs, config);
      expect(result).toBeInstanceOf(ExportableCodeSystem);
      expect(result.name).toBe('MyCodeSystem');
      expect(result.id).toBe('my.code-system');
    });

    it('should convert a CodeSystem whose name includes whitespace', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-codesystem.json'), 'utf-8')
      );
      input.name = 'Simple\nCodeSystem';
      const result = CodeSystemProcessor.process(input, defs, config);

      const expectedNameRule = new ExportableCaretValueRule('');
      expectedNameRule.caretPath = 'name';
      expectedNameRule.value = 'Simple\nCodeSystem';

      expect(result).toBeInstanceOf(ExportableCodeSystem);
      expect(result.name).toBe('Simple_CodeSystem');
      expect(result.rules).toContainEqual(expectedNameRule);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        'CodeSystem with id simple.codesystem has name with whitespace. Converting whitespace to underscores.'
      );
    });

    it('should not convert a CodeSystem with a concept designation', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'concept-codesystem.json'), 'utf-8')
      );
      input.concept[2].designation = {
        language: 'fr',
        value: 'diner-dangereux'
      };
      const result = CodeSystemProcessor.process(input, defs, config);
      expect(result).toBeUndefined();
    });

    it('should not convert a CodeSystem with a concept property', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'concept-codesystem.json'), 'utf-8')
      );
      input.concept[0].property = {
        code: 'healthy',
        valueCode: 'sometimes'
      };
      const result = CodeSystemProcessor.process(input, defs, config);
      expect(result).toBeUndefined();
    });

    it('should not convert a CodeSystem with a child concept', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'concept-codesystem.json'), 'utf-8')
      );
      input.concept[0].concept = {
        code: 'breakfast2',
        display: 'Second breakfast'
      };
      const result = CodeSystemProcessor.process(input, defs, config);
      expect(result).toBeUndefined();
    });
  });

  describe('#extractKeywords', () => {
    it('should get keywords for a CodeSystem with simple metadata', () => {
      // Simple metadata fields are Id, Title, Description
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-codesystem.json'), 'utf-8')
      );
      const workingCodeSystem = new ExportableCodeSystem('MyCodeSystem');
      CodeSystemProcessor.extractKeywords(input, workingCodeSystem);
      expect(workingCodeSystem.id).toBe('my-code-system');
      expect(workingCodeSystem.title).toBe('My Code System');
      expect(workingCodeSystem.description).toBe('This is my simple code system with metadata');
    });
  });

  describe('#extractRules', () => {
    it('should extract an ExportableConceptRule for each concept', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'concept-codesystem.json'), 'utf-8')
      );
      const workingCodeSystem = new ExportableCodeSystem('MyCodeSystem');
      CodeSystemProcessor.extractRules(input, workingCodeSystem, defs, config);
      expect(workingCodeSystem.rules).toHaveLength(4);
      expect(workingCodeSystem.rules).toEqual(
        expect.arrayContaining([
          new ExportableConceptRule('breakfast'),
          new ExportableConceptRule('lunch', undefined, 'Meal typically eaten at midday.'),
          new ExportableConceptRule('dinner', 'Evening meal (non-dangerous)'),
          new ExportableConceptRule(
            'dangerous-dinner',
            'Evening meal (dangerous)',
            'Meal eaten during the late evening. Should only be eaten by dinner experts.'
          )
        ])
      );
    });

    it('should add caret rules to a CodeSystem', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-codesystem.json'), 'utf-8')
      );

      const targetCodeSystem = new ExportableCodeSystem('MyValueSet');
      CodeSystemProcessor.extractRules(input, targetCodeSystem, defs, config);
      expect(targetCodeSystem.rules).toHaveLength(0);

      input.experimental = true;
      CodeSystemProcessor.extractRules(input, targetCodeSystem, defs, config);
      const experimentalRule = new ExportableCaretValueRule('');
      experimentalRule.caretPath = 'experimental';
      experimentalRule.value = true;
      expect(targetCodeSystem.rules.length).toBe(1);
      expect(targetCodeSystem.rules).toContainEqual<ExportableCaretValueRule>(experimentalRule);
    });
  });
});
