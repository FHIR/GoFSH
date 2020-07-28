import path from 'path';
import { FHIRDefinitions, loadFromPath } from 'fsh-sushi/dist/fhirdefs';
import { FshCodeSystem } from 'fsh-sushi/dist/fshtypes';
import { CodeSystemProcessor } from '../../src/processor';

describe('CodeSystemProcessor', () => {
  let processor: CodeSystemProcessor;
  let defs: FHIRDefinitions;

  beforeAll(() => {
    processor = new CodeSystemProcessor();
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, 'fixtures'), 'testpackage', defs);
  });

  it('should convert the simplest CodeSystem', () => {
    const input = defs.fishForFHIR('SimpleCodeSystem');
    const result = processor.process(input);
    expect(result).toBeInstanceOf(FshCodeSystem);
    expect(result.name).toBe('SimpleCodeSystem');
  });

  it('should convert a CodeSystem with simple metadata', () => {
    // Simple metadata fields are Id, Title, Description
    const input = defs.fishForFHIR('MyCodeSystem');
    const result = processor.process(input);
    expect(result).toBeInstanceOf(FshCodeSystem);
    expect(result.name).toBe('MyCodeSystem');
    expect(result.id).toBe('my-code-system');
    expect(result.title).toBe('My Code System');
    expect(result.description).toBe('This is my simple code system with metadata');
  });
});
