import path from 'path';
import fs from 'fs-extra';
import { StructureDefinition } from 'fsh-sushi/dist/fhirtypes';
import { ExtensionProcessor } from '../../src/processor';
import { Extension } from 'fsh-sushi/dist/fshtypes';

describe('ExtensiomProcessor', () => {
  let processor: ExtensionProcessor;

  beforeAll(() => {
    processor = new ExtensionProcessor();
  });

  it('should convert the simplest Extension', () => {
    const input = StructureDefinition.fromJSON(
      JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-extension.json'), 'utf-8')
      )
    );
    const result = processor.process(input);
    expect(result).toBeInstanceOf(Extension);
    expect(result.name).toBe('SimpleExtension');
  });

  it('should convert an Extension with simple metadata', () => {
    // simple metadata fields are Id, Title, and Description
    const input = StructureDefinition.fromJSON(
      JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'metadata-extension.json'), 'utf-8')
      )
    );
    const result = processor.process(input);
    expect(result).toBeInstanceOf(Extension);
    expect(result.name).toBe('MyExtension');
    expect(result.id).toBe('my-extension');
    expect(result.title).toBe('My New Extension');
    expect(result.description).toBe('This is my new Extension. Thank you.');
  });
});
