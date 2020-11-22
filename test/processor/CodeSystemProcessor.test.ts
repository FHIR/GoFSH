import path from 'path';
import fs from 'fs-extra';
import { fhirdefs } from 'fsh-sushi';
import { CodeSystemProcessor } from '../../src/processor';
import {
  ExportableCodeSystem,
  ExportableConceptRule,
  ExportableCaretValueRule
} from '../../src/exportable';
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';

describe('CodeSystemProcessor', () => {
  let defs: fhirdefs.FHIRDefinitions;

  beforeAll(() => {
    defs = loadTestDefinitions();
  });
  describe('#process', () => {
    it('should convert the simplest CodeSystem', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-codesystem.json'), 'utf-8')
      );
      const result = CodeSystemProcessor.process(input, defs);
      expect(result).toBeInstanceOf(ExportableCodeSystem);
      expect(result.name).toBe('SimpleCodeSystem');
    });

    it('should not convert a CodeSystem without a name or id', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-codesystem.json'), 'utf-8')
      );
      const result = CodeSystemProcessor.process(input, defs);
      expect(result).toBeUndefined();
    });

    it('should convert a CodeSystem without a name but with an id', () => {
      const input = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, 'fixtures', 'nameless-codesystem-with-id.json'),
          'utf-8'
        )
      );
      const result = CodeSystemProcessor.process(input, defs);
      expect(result).toBeInstanceOf(ExportableCodeSystem);
      expect(result.name).toBe('MyCodeSystem');
      expect(result.id).toBe('my.code-system');
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
      CodeSystemProcessor.extractRules(input, workingCodeSystem, defs);
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
      CodeSystemProcessor.extractRules(input, targetCodeSystem, defs);
      expect(targetCodeSystem.rules).toHaveLength(0);

      input.experimental = true;
      CodeSystemProcessor.extractRules(input, targetCodeSystem, defs);
      const experimentalRule = new ExportableCaretValueRule('');
      experimentalRule.caretPath = 'experimental';
      experimentalRule.value = true;
      expect(targetCodeSystem.rules.length).toBe(1);
      expect(targetCodeSystem.rules).toContainEqual<ExportableCaretValueRule>(experimentalRule);
    });
  });
});
