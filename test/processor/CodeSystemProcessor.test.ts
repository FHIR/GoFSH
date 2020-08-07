import path from 'path';
import fs from 'fs-extra';
import { CodeSystemProcessor } from '../../src/processor';
import { ExportableCodeSystem } from '../../src/exportable';

describe('CodeSystemProcessor', () => {
  it('should convert the simplest CodeSystem', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-codesystem.json'), 'utf-8')
    );
    const result = CodeSystemProcessor.process(input);
    expect(result).toBeInstanceOf(ExportableCodeSystem);
    expect(result.name).toBe('SimpleCodeSystem');
  });

  it('should convert a CodeSystem with simple metadata', () => {
    // Simple metadata fields are Id, Title, Description
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-codesystem.json'), 'utf-8')
    );
    const result = CodeSystemProcessor.process(input);
    expect(result).toBeInstanceOf(ExportableCodeSystem);
    expect(result.name).toBe('MyCodeSystem');
    expect(result.id).toBe('my-code-system');
    expect(result.title).toBe('My Code System');
    expect(result.description).toBe('This is my simple code system with metadata');
  });

  it('should not convert a CodeSystem without a name', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-codesystem.json'), 'utf-8')
    );
    const result = CodeSystemProcessor.process(input);
    expect(result).toBeUndefined();
  });
});
