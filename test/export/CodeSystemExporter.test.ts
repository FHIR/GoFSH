import { CodeSystemExporter } from '../../src/export';
import { FshCodeSystem } from 'fsh-sushi/dist/fshtypes';
import { EOL } from 'os';
import { ConceptRule } from 'fsh-sushi/dist/fshtypes/rules';

describe('CodeSystemExporter', () => {
  let exporter: CodeSystemExporter;

  beforeAll(() => {
    exporter = new CodeSystemExporter();
  });

  it('should export the simplest CodeSystem', () => {
    const input = new FshCodeSystem('SimpleCodeSystem');

    const expectedResult = ['CodeSystem: SimpleCodeSystem', 'Id: SimpleCodeSystem'].join(EOL);
    const result = exporter.export(input);
    expect(result).toBe(expectedResult);
  });

  it('should export a CodeSystem with additional metadata', () => {
    const input = new FshCodeSystem('MetaCodeSystem');
    input.id = 'meta-code-system';
    input.title = 'Meta CodeSystem';
    input.description = 'This is a CodeSystem with some metadata.';

    const expectedResult = [
      'CodeSystem: MetaCodeSystem',
      'Id: meta-code-system',
      'Title: "Meta CodeSystem"',
      'Description: "This is a CodeSystem with some metadata."'
    ].join(EOL);
    const result = exporter.export(input);
    expect(result).toBe(expectedResult);
  });

  it('should export a CodeSystem with metadata that contains characters that are escaped in FSH', () => {
    const input = new FshCodeSystem('NewlineCodeSystem');
    input.id = 'newline-code-system';
    input.description =
      'This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';

    const expectedResult = [
      'CodeSystem: NewlineCodeSystem',
      'Id: newline-code-system',
      'Description: "This description\\nhas a newline in it. Is that \\\\not allowed\\\\? Is that \\"not okay\\"?"'
    ].join(EOL);
    const result = exporter.export(input);
    expect(result).toBe(expectedResult);
  });

  describe('#conceptRule', () => {
    let codeSystem: FshCodeSystem;

    beforeEach(() => {
      codeSystem = new FshCodeSystem('MyCodeSystem');
    });

    it('should export a CodeSystem with a ConceptRule with only code', () => {
      const conceptRule = new ConceptRule('foo');
      codeSystem.rules.push(conceptRule);

      const expectedResult = ['CodeSystem: MyCodeSystem', 'Id: MyCodeSystem', '* #foo'].join(EOL);
      const result = exporter.export(codeSystem);
      expect(result).toBe(expectedResult);
    });

    it('should export a CodeSystem with a ConceptRule with code and display', () => {
      const conceptRule = new ConceptRule('foo');
      conceptRule.display = 'bar';
      codeSystem.rules.push(conceptRule);

      const expectedResult = ['CodeSystem: MyCodeSystem', 'Id: MyCodeSystem', '* #foo "bar"'].join(
        EOL
      );
      const result = exporter.export(codeSystem);
      expect(result).toBe(expectedResult);
    });

    it('should export a CodeSystem with a ConceptRule with code, display, and definition', () => {
      const conceptRule = new ConceptRule('foo');
      conceptRule.display = 'bar';
      conceptRule.definition = 'baz';
      codeSystem.rules.push(conceptRule);

      const expectedResult = [
        'CodeSystem: MyCodeSystem',
        'Id: MyCodeSystem',
        '* #foo "bar" "baz"'
      ].join(EOL);
      const result = exporter.export(codeSystem);
      expect(result).toBe(expectedResult);
    });

    it('should export a CodeSystem with a ConceptRule with code and definition', () => {
      const conceptRule = new ConceptRule('foo');
      conceptRule.definition = 'baz';
      codeSystem.rules.push(conceptRule);

      const expectedResult = [
        'CodeSystem: MyCodeSystem',
        'Id: MyCodeSystem',
        '* #foo """baz"""'
      ].join(EOL);
      const result = exporter.export(codeSystem);
      expect(result).toBe(expectedResult);
    });

    it('should export a CodeSystem with multiple ConceptRules', () => {
      const conceptRule1 = new ConceptRule('foo');
      conceptRule1.display = 'bar';
      conceptRule1.definition = 'baz';
      codeSystem.rules.push(conceptRule1);
      const conceptRule2 = new ConceptRule('oof');
      conceptRule2.display = 'rab';
      conceptRule2.definition = 'zab';
      codeSystem.rules.push(conceptRule2);

      const expectedResult = [
        'CodeSystem: MyCodeSystem',
        'Id: MyCodeSystem',
        '* #foo "bar" "baz"',
        '* #oof "rab" "zab"'
      ].join(EOL);
      const result = exporter.export(codeSystem);
      expect(result).toBe(expectedResult);
    });
  });
});
