import fs from 'fs-extra';
import path from 'path';
import { AliasProcessor } from '../../src/processor';
import { ExportableAlias } from '../../src/exportable';
import { loggerSpy } from '../helpers/loggerSpy';

describe('AliasProcessor', () => {
  beforeEach(() => {
    loggerSpy.reset();
  });

  it('should convert the simplest example Alias', () => {
    const aliasFile = path.join(__dirname, 'fixtures', 'simple-aliases.fsh');
    const result = AliasProcessor.process(aliasFile);
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(1);
    expect(result[0]).toStrictEqual(new ExportableAlias('$sct', 'http://snomed.info/sct'));
  });

  it('should convert the custom example Alias', () => {
    const aliasFile = path.join(__dirname, 'fixtures', 'custom-aliases.fsh');
    const result = AliasProcessor.process(aliasFile);
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(8);
    expect(result[0]).toStrictEqual(new ExportableAlias('$sct', 'http://snomed.info/sct'));
    expect(result[1]).toStrictEqual(
      new ExportableAlias('V2-0203', 'http://terminology.hl7.org/CodeSystem/v2-0203')
    );
    expect(result[2].alias).toBe('US-NPI');
    expect(result[2].url).toBe('http://hl7.org/fhir/sid/us-npi');
    expect(result[3].alias).toBe('invalid-url');
    expect(result[3].url).toBe('http://invalid-url');
    expect(result[4].alias).toBe('comments');
    expect(result[4].url).toBe('http://comments');
    expect(result[5].alias).toBe('$first');
    expect(result[5].url).toBe('http://example.org/first');
    expect(result[6].alias).toBe('$second');
    expect(result[6].url).toBe('http://example.org/second');
    expect(result[7].alias).toBe('$third');
    expect(result[7].url).toBe('http://example.org/third');
  });

  describe('yieldAliases', () => {
    it('should yield the simplest example Alias', () => {
      const aliasFile = path.join(__dirname, 'fixtures', 'simple-aliases.fsh');
      const fileContents = fs.readFileSync(aliasFile).toString();

      const resultGenerator = AliasProcessor.yieldAliases(fileContents);
      const result = Array.from(resultGenerator);

      expect(result.length).toBe(1);
      expect(result[0]).toStrictEqual('Alias: $sct = http://snomed.info/sct\r\n');
    });

    it('should yield the complex example Alias', () => {
      const aliasFile = path.join(__dirname, 'fixtures', 'custom-aliases.fsh');
      const fileContents = fs.readFileSync(aliasFile).toString();

      const resultGenerator = AliasProcessor.yieldAliases(fileContents);
      const result = Array.from(resultGenerator);

      expect(result.length).toBe(8);
      expect(result[0]).toContain('Alias: $sct = http://snomed.info/sct\r\n');
    });
  });
});
