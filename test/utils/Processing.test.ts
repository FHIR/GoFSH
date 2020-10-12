import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { fhirdefs } from 'fsh-sushi';

import { loggerSpy } from '../helpers/loggerSpy';
import {
  ensureOutputDir,
  getInputDir,
  getResources,
  loadExternalDependencies,
  writeFSH
} from '../../src/utils/Processing';
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

    it('should use a directory named gofsh as a default when no directory is provided', () => {
      const result = ensureOutputDir(undefined);
      expect(result).toBe('gofsh');
      expect(loggerSpy.getLastMessage('info')).toBe(`Using output directory: ${result}`);
    });

    it('should use the provided directory when one is given', () => {
      const output = path.join(tempRoot, 'my-fsh');
      const result = ensureOutputDir(output);
      expect(result).toBe(output);
      expect(fs.existsSync(result)).toBeTruthy();
      expect(loggerSpy.getLastMessage('info')).toBe(`Using output directory: ${result}`);
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
      const result = getResources(inDir, undefined);
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
      const result = getResources(inDir, undefined);
      expect(result instanceof Package).toBeTruthy();
      expect(processSpy).toHaveBeenCalledTimes(1);
      expect(processSpy).toHaveBeenCalledWith<[string]>(path.join(inDir));
    });

    it('should throw an error when the input directory does not exist', () => {
      const inDir = path.join(__dirname, 'wrong-fixtures');
      expect(() => {
        getResources(inDir, undefined);
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

  describe('loadExternalDependencies', () => {
    beforeAll(() => {
      jest
        .spyOn(fhirdefs, 'loadDependency')
        .mockImplementation(
          async (packageName: string, version: string, FHIRDefs: fhirdefs.FHIRDefinitions) => {
            // the mock loader can find hl7.fhir.r4.core and hl7.fhir.us.core
            if (packageName === 'hl7.fhir.r4.core' || packageName === 'hl7.fhir.us.core') {
              FHIRDefs.packages.push(`${packageName}#${version}`);
              return Promise.resolve(FHIRDefs);
            } else {
              throw new Error();
            }
          }
        );
    });
    beforeEach(() => {
      loggerSpy.reset();
    });

    it('should load specified dependencies', () => {
      const defs = new fhirdefs.FHIRDefinitions();
      const dependencies = ['hl7.fhir.us.core@3.1.0'];
      const dependencyDefs = loadExternalDependencies(defs, dependencies);
      return Promise.all(dependencyDefs).then(() => {
        expect(defs.packages).toHaveLength(2);
        expect(defs.packages).toContain('hl7.fhir.r4.core#4.0.1');
        expect(defs.packages).toContain('hl7.fhir.us.core#3.1.0');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });
    });

    it('should log an error when it fails to load a dependency', () => {
      const defs = new fhirdefs.FHIRDefinitions();
      const badDependencies = ['hl7.does.not.exist@current'];
      const dependencyDefs = loadExternalDependencies(defs, badDependencies);
      return Promise.all(dependencyDefs).then(() => {
        expect(defs.packages).toHaveLength(1);
        expect(defs.packages).toContain('hl7.fhir.r4.core#4.0.1');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Failed to load hl7\.does\.not\.exist@current/s
        );
      });
    });

    it('should log an error when a dependency has no specified version', () => {
      const defs = new fhirdefs.FHIRDefinitions();
      const badDependencies = ['hl7.fhir.us.core']; // No version
      const dependencyDefs = loadExternalDependencies(defs, badDependencies);
      return Promise.all(dependencyDefs).then(() => {
        expect(defs.packages).toHaveLength(1);
        expect(defs.packages).toContain('hl7.fhir.r4.core#4.0.1');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Failed to load hl7\.fhir\.us\.core: No version specified\./s
        );
      });
    });

    it('should load only FHIR if no dependencies specified', () => {
      const defs = new fhirdefs.FHIRDefinitions();
      // No dependencies specified on CLI will pass in undefined
      const dependencyDefs = loadExternalDependencies(defs, undefined);
      return Promise.all(dependencyDefs).then(() => {
        expect(defs.packages).toHaveLength(1);
        expect(defs.packages).toContain('hl7.fhir.r4.core#4.0.1');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });
    });
  });
});
