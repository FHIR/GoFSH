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

  it('should not attempt to parse a file that does not have the fsh extension', () => {
    const aliasFile = path.join(__dirname, 'fixtures', 'small-profile.json');
    const result = AliasProcessor.process(aliasFile);
    expect(result).toHaveLength(0);
  });

  it('should log an error when the path provided does not exist', () => {
    const aliasFile = path.join(__dirname, 'fixtures', 'not-a-real-file.fsh');
    const result = AliasProcessor.process(aliasFile);
    expect(result).toHaveLength(0);
    expect(loggerSpy.getLastMessage('error')).toMatch(/^Alias file read failed with error/s);
  });

  it('should log a warning when the fsh file contains no aliases', () => {
    const aliasFile = path.join(__dirname, 'fixtures', 'no-aliases.fsh');
    const result = AliasProcessor.process(aliasFile);
    expect(result).toHaveLength(0);
    expect(loggerSpy.getLastMessage('warn')).toMatch(/^No aliases present/s);
  });

  describe('parseAliases', () => {
    it('should find all aliases in the specified fsh file', () => {
      const aliasFile = path.join(__dirname, 'fixtures', 'custom-aliases.fsh');
      const fileContents = fs.readFileSync(aliasFile).toString();

      const result = AliasProcessor.parseAliases(fileContents);
      expect(result).toHaveLength(8);
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

    it('should log errors for invalid aliases', () => {
      const aliasFile = path.join(__dirname, 'fixtures', 'invalid-alias.fsh');
      const result = AliasProcessor.process(aliasFile);
      expect(result).toHaveLength(3);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(2);
      expect(loggerSpy.getMessageAtIndex(0, 'error')).toMatch(
        /Alias \$not\|valid cannot include "\|"/s
      );
      expect(loggerSpy.getMessageAtIndex(1, 'error')).toMatch(/Alias \$valid cannot be redefined/s);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Alias \$valid~ish includes unsupported characters/
      );
    });
  });
});
