import path from 'path';
import { StructureDefinition } from 'fsh-sushi/dist/fhirtypes';
import { FHIRDefinitions, loadFromPath } from 'fsh-sushi/dist/fhirdefs';
import { ExtensionProcessor } from '../../src/processor';
import { Extension } from 'fsh-sushi/dist/fshtypes';

describe('ExtensiomProcessor', () => {
  let processor: ExtensionProcessor;
  let defs: FHIRDefinitions;

  beforeAll(() => {
    processor = new ExtensionProcessor();
    defs = new FHIRDefinitions();
    loadFromPath(path.join(__dirname, 'fixtures'), 'testpackage', defs);
  });

  it('should convert the simplest Extension', () => {
    const input = StructureDefinition.fromJSON(defs.fishForFHIR('SimpleExtension'));
    const result = processor.process(input);
    expect(result).toBeInstanceOf(Extension);
    expect(result.name).toBe('SimpleExtension');
  });

  it('should convert an Extension with simple metadata', () => {
    // simple metadata fields are Id, Title, and Description
    const input = StructureDefinition.fromJSON(defs.fishForFHIR('MyExtension'));
    const result = processor.process(input);
    expect(result).toBeInstanceOf(Extension);
    expect(result.name).toBe('MyExtension');
    expect(result.id).toBe('my-extension');
    expect(result.title).toBe('My New Extension');
    expect(result.description).toBe('This is my new Extension. Thank you.');
  });
});
