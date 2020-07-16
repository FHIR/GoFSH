import { ExtensionExporter } from '../../src/export';
import { Extension } from 'fsh-sushi/dist/fshtypes';
import { EOL } from 'os';

describe('ExtensionExporter', () => {
  let exporter: ExtensionExporter;

  beforeAll(() => {
    exporter = new ExtensionExporter();
  });

  it('should export the simplest extension', () => {
    const input = new Extension('SimpleExtension');

    const expectedResult = ['Extension: SimpleExtension', 'Id: SimpleExtension'].join(EOL);
    const result = exporter.export(input);
    expect(result).toBe(expectedResult);
  });

  it('should export an extension with additional metadata', () => {
    const input = new Extension('MyExtension');
    input.parent = 'Extension';
    input.id = 'my-extension';
    input.title = 'My Extension';
    input.description = 'My extension is not very extensive.';

    const expectedResult = [
      'Extension: MyExtension',
      // NOTE: Since parent is Extension, it is ommitted from FSH
      'Id: my-extension',
      'Title: "My Extension"',
      'Description: "My extension is not very extensive."'
    ].join(EOL);
    const result = exporter.export(input);
    expect(result).toBe(expectedResult);
  });

  it('should export an extension extending another extension', () => {
    const input = new Extension('MyExtension');
    input.parent = 'ParentExtension';
    input.id = 'my-extension';
    input.title = 'My Extension';
    input.description = 'My extension extending ParentExtension.';

    const expectedResult = [
      'Extension: MyExtension',
      'Parent: ParentExtension',
      'Id: my-extension',
      'Title: "My Extension"',
      'Description: "My extension extending ParentExtension."'
    ].join(EOL);
    const result = exporter.export(input);
    expect(result).toBe(expectedResult);
  });

  it('should export an extension with metadata that contains characters that are escaped in FSH', () => {
    const input = new Extension('NewlineExtension');
    input.id = 'newline-extension';
    input.description =
      'This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';

    const expectedResult = [
      'Extension: NewlineExtension',
      'Id: newline-extension',
      'Description: "This description\\nhas a newline in it. Is that \\\\not allowed\\\\? Is that \\"not okay\\"?"'
    ].join(EOL);
    const result = exporter.export(input);
    expect(result).toBe(expectedResult);
  });
});
