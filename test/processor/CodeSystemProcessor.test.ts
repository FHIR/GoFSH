import path from 'path';
import fs from 'fs-extra';
import { fshtypes } from 'fsh-sushi';
import { CodeSystemProcessor } from '../../src/processor';
import {
  ExportableCodeSystem,
  ExportableConceptRule,
  ExportableCaretValueRule
} from '../../src/exportable';
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';
import { FHIRDefinitions } from '../../src/utils';
import { loggerSpy } from '../helpers/loggerSpy';
import { FshCode } from 'fsh-sushi/dist/fshtypes';

describe('CodeSystemProcessor', () => {
  let defs: FHIRDefinitions;
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
        'CodeSystem with id simple.codesystem has name with whitespace (Simple\nCodeSystem). Converting whitespace to underscores (Simple_CodeSystem).'
      );
    });

    it('should convert a CodeSystem with a concept designation', () => {
      const input = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, 'fixtures', 'designation-concept-codesystem.json'),
          'utf-8'
        )
      );
      const result = CodeSystemProcessor.process(input, defs, config);
      const caretRule1 = new ExportableCaretValueRule('');
      caretRule1.caretPath = 'designation[0].language';
      caretRule1.isCodeCaretRule = true;
      caretRule1.pathArray = ['#dangerous-dinner'];
      caretRule1.value = new FshCode('fr');

      const caretRule2 = new ExportableCaretValueRule('');
      caretRule2.caretPath = 'designation[0].value';
      caretRule2.isCodeCaretRule = true;
      caretRule2.pathArray = ['#dangerous-dinner'];
      caretRule2.value = 'diner-dangereux';

      expect(result).toBeInstanceOf(ExportableCodeSystem);
      expect(result.rules).toContainEqual(caretRule1);
      expect(result.rules).toContainEqual(caretRule2);
    });

    it('should convert a CodeSystem with a concept property', () => {
      const input = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, 'fixtures', 'property-concept-codesystem.json'),
          'utf-8'
        )
      );
      const result = CodeSystemProcessor.process(input, defs, config);
      const caretRule1 = new ExportableCaretValueRule('');
      caretRule1.caretPath = 'property[0].code';
      caretRule1.isCodeCaretRule = true;
      caretRule1.pathArray = ['#breakfast'];
      caretRule1.value = new FshCode('healthy');

      const caretRule2 = new ExportableCaretValueRule('');
      caretRule2.caretPath = 'property[0].valueCode';
      caretRule2.isCodeCaretRule = true;
      caretRule2.pathArray = ['#breakfast'];
      caretRule2.value = new FshCode('sometimes');

      expect(result).toBeInstanceOf(ExportableCodeSystem);
      expect(result.name).toBe('ConceptCodeSystem');
      expect(result.rules).toContainEqual(caretRule1);
      expect(result.rules).toContainEqual(caretRule2);
    });

    it('should convert a CodeSystem with children concepts', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nested-concept-codesystem.json'), 'utf-8')
      );

      const conceptRule1 = new ExportableConceptRule(
        'water-tribe',
        'Water Tribe',
        'Waterbenders of the Avatar universe'
      );
      conceptRule1.hierarchy = [];
      const conceptRule2 = new ExportableConceptRule(
        'southern',
        'Southern Water Tribe',
        'Waterbenders of the South Pole'
      );
      conceptRule2.hierarchy = ['water-tribe'];
      const conceptRule3 = new ExportableConceptRule(
        'northern',
        'Northern Water Tribe',
        'Waterbenders of the North Pole'
      );
      conceptRule3.hierarchy = ['water-tribe'];
      const conceptRule4 = new ExportableConceptRule(
        'colonies',
        'Water Tribe colonies',
        'Colonies set up by the Water Tribe'
      );
      conceptRule4.hierarchy = ['water-tribe'];
      const conceptRule5 = new ExportableConceptRule(
        'swamp-tribe',
        'Swamp Tribe',
        'Waterbenders of the Foggy Swamp'
      );
      conceptRule5.hierarchy = ['water-tribe', 'colonies'];

      const result = CodeSystemProcessor.process(input, defs, config);
      expect(result).toBeInstanceOf(ExportableCodeSystem);
      expect(result.name).toBe('AvatarCS');
      expect(result.id).toBe('avatar-cs');
      expect(result.rules).toEqual([
        conceptRule1,
        conceptRule2,
        conceptRule3,
        conceptRule4,
        conceptRule5
      ]);
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
