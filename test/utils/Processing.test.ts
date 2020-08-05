import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';

import { loggerSpy } from '../helpers/loggerSpy';
import { getInputDir, ensureOutputDir, getResources, writeFSH } from '../../src/utils/Processing';
import { FHIRProcessor } from '../../src/processor/FHIRProcessor';
import { Package } from '../../src/processor';

describe('Processing', () => {
  temp.track();

  describe('#getInputDir', () => {
    let tempRoot: string;

    beforeAll(() => {
      tempRoot = temp.mkdirSync('my-fhir');
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should use the current directory as a default when no directory is provided', () => {
      const result = getInputDir(undefined);
      expect(result).toBe('.');
      expect(loggerSpy.getLastMessage('info')).toBe('Using input directory: .');
    });

    it('should use the provided directory when one is given', () => {
      const input = path.join(tempRoot, 'my-fhir');
      const result = getInputDir(input);
      expect(result).toBe(input);
      expect(loggerSpy.getLastMessage('info')).toBe(`Using input directory: ${input}`);
    });
  });

  describe('ensureOutputDir', () => {
    let tempRoot: string;

    beforeAll(() => {
      tempRoot = temp.mkdirSync('gofsh-test');
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should use a directory named fsh as a default when no directory is provided', () => {
      const result = ensureOutputDir(undefined);
      expect(result).toBe('fsh');
    });

    it('should use the provided directory when one is given', () => {
      const output = path.join(tempRoot, 'my-fsh');
      const result = ensureOutputDir(output);
      expect(result).toBe(output);
      expect(fs.existsSync(result)).toBeTruthy();
    });
  });

  describe('getResources', () => {
    let processSpy: jest.SpyInstance;

    beforeAll(() => {
      processSpy = jest.spyOn(FHIRProcessor.prototype, 'process');
    });

    beforeEach(() => {
      processSpy.mockClear();
    });

    it('should try to process each json file in the directory and its subdirectories when given a path to a directory', () => {
      const inDir = path.join(__dirname, 'fixtures');
      const result = getResources(inDir);
      expect(result instanceof Package).toBeTruthy();
      expect(processSpy).toHaveBeenCalledTimes(3);
      expect(processSpy).toHaveBeenCalledWith<[string]>(path.join(inDir, 'simple-profile.json'));
      expect(processSpy).toHaveBeenCalledWith<[string]>(path.join(inDir, 'other-resource.json'));
      expect(processSpy).toHaveBeenCalledWith<[string]>(
        path.join(inDir, 'more-things', 'another-resource.json')
      );
    });

    it('should process the specified file when given a path to a file', () => {
      const inDir = path.join(__dirname, 'fixtures', 'simple-profile.json');
      const result = getResources(inDir);
      expect(result instanceof Package).toBeTruthy();
      expect(processSpy).toHaveBeenCalledTimes(1);
      expect(processSpy).toHaveBeenCalledWith<[string]>(path.join(inDir));
    });

    it('should throw an error when the input directory does not exist', () => {
      const inDir = path.join(__dirname, 'wrong-fixtures');
      expect(() => {
        getResources(inDir);
      }).toThrow();
    });
  });

  describe('writeFSH', () => {
    let tempRoot: string;

    beforeAll(() => {
      tempRoot = temp.mkdirSync('my-fsh');
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should write output to a file named resources.fsh in the output directory', () => {
      const resources = new Package();
      writeFSH(resources, tempRoot);
      expect(fs.existsSync(path.join(tempRoot, 'resources.fsh'))).toBeTruthy();
    });
  });
});
