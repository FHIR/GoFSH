import path from 'path';
import fs from 'fs-extra';
import { compact } from 'lodash';
import { CodeSystemProcessor, ProcessableConceptDefinition } from '../../src/processor';
import { ExportableCodeSystem, ExportableConceptRule } from '../../src/exportable';

describe('CodeSystemProcessor', () => {
  describe('#process', () => {
    it('should convert the simplest CodeSystem', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-codesystem.json'), 'utf-8')
      );
      const result = CodeSystemProcessor.process(input);
      expect(result).toBeInstanceOf(ExportableCodeSystem);
      expect(result.name).toBe('SimpleCodeSystem');
    });

    it('should not convert a CodeSystem without a name or id', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-codesystem.json'), 'utf-8')
      );
      const result = CodeSystemProcessor.process(input);
      expect(result).toBeUndefined();
    });

    it('should convert a CodeSystem without a name but with an id', () => {
      const input = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, 'fixtures', 'nameless-codesystem-with-id.json'),
          'utf-8'
        )
      );
      const result = CodeSystemProcessor.process(input);
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
    it('should extract an ExportableConceptRule for each concept that has a code', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'concept-codesystem.json'), 'utf-8')
      );
      const workingCodeSystem = new ExportableCodeSystem('MyCodeSystem');
      const concepts = compact<ProcessableConceptDefinition>(
        input.concept?.map((rawConcept: any) => {
          if (CodeSystemProcessor.isCodeSystemConcept(rawConcept)) {
            return {
              ...rawConcept,
              processedPaths: []
            } as ProcessableConceptDefinition;
          }
        }) ?? []
      );
      CodeSystemProcessor.extractRules(input, concepts, workingCodeSystem);
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
  });
});
