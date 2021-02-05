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
  writeFSH,
  getIgPathFromIgIni,
  getFhirProcessor
} from '../../src/utils/Processing';
import { Package } from '../../src/processor';
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';
import {
  ExportableConfiguration,
  ExportableInstance,
  ExportableProfile,
  ExportableAssignmentRule
} from '../../src/exportable';

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

    it('should empty the provided output directory', () => {
      const output = path.join(tempRoot, 'my-fsh');
      fs.createFileSync(path.join(output, 'something.json'));
      const result = ensureOutputDir(output);
      expect(result).toBe(output);
      expect(fs.existsSync(result)).toBeTruthy();
      expect(fs.readdirSync(result)).toHaveLength(0);
    });
  });

  describe('getResources', () => {
    beforeEach(() => loggerSpy.reset());

    it('should try to register each json file in the directory and its subdirectories when given a path to a directory', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'all-good');
      const processor = await getFhirProcessor(inDir, undefined);
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      expect(result.profiles).toHaveLength(1);
      expect(result.codeSystems).toHaveLength(1);
      expect(result.valueSets).toHaveLength(1);
      expect(result.extensions).toHaveLength(0);
      expect(result.instances).toHaveLength(0);
      expect(result.invariants).toHaveLength(0);
      expect(result.mappings).toHaveLength(0);
    });

    it('should register the specified file when given a path to a file', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'all-good', 'simple-profile.json');
      const processor = await getFhirProcessor(inDir, undefined);
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      expect(result.profiles).toHaveLength(1);
      expect(result.codeSystems).toHaveLength(0);
      expect(result.valueSets).toHaveLength(0);
      expect(result.extensions).toHaveLength(0);
      expect(result.instances).toHaveLength(0);
      expect(result.invariants).toHaveLength(0);
      expect(result.mappings).toHaveLength(0);
    });

    it('should log an error when an input file is not valid JSON', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'one-bad');
      const processor = await getFhirProcessor(inDir, undefined);
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      expect(loggerSpy.getLastMessage('error')).toMatch(/Could not load .*invalid-profile\.json/);
      expect(result.profiles).toHaveLength(1);
      expect(result.codeSystems).toHaveLength(0);
      expect(result.valueSets).toHaveLength(0);
      expect(result.extensions).toHaveLength(0);
      expect(result.instances).toHaveLength(0);
      expect(result.invariants).toHaveLength(0);
      expect(result.mappings).toHaveLength(0);
    });

    it('should log debug statements for valid JSON that is not a valid FHIR resource', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'some-non-fhir');
      const processor = await getFhirProcessor(inDir, undefined);
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      expect(loggerSpy.getMessageAtIndex(0, 'debug')).toMatch(
        /Skipping non-FHIR input: .*non-fhir\.json/
      );
      expect(loggerSpy.getMessageAtIndex(1, 'debug')).toMatch(
        /Skipping temporary "comparison" resource created by IG Publisher: .*sd-us-core-observation-lab-mcode-cancer-disease-status-intersection\.json/
      );
      expect(result.profiles).toHaveLength(1);
      expect(result.codeSystems).toHaveLength(0);
      expect(result.valueSets).toHaveLength(0);
      expect(result.extensions).toHaveLength(0);
      expect(result.instances).toHaveLength(0);
      expect(result.invariants).toHaveLength(0);
      expect(result.mappings).toHaveLength(0);
    });

    it('should not try to process escaped JSON files or files generated by the publisher that will hang when output is a child of the specified path', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'bad-publisher-files');
      const processor = await getFhirProcessor(inDir, loadTestDefinitions());
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      const expansionsPath = path.join(
        __dirname,
        'fixtures',
        'bad-publisher-files',
        'output',
        'expansions.json'
      );
      const escapedJSONPath = path.join(
        __dirname,
        'fixtures',
        'bad-publisher-files',
        'simple-profile.escaped.json'
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0); // simple-profile.escaped.json not processed
      expect(loggerSpy.getMessageAtIndex(0, 'debug')).toMatch(`Skipping ${expansionsPath} file`);
      expect(loggerSpy.getMessageAtIndex(1, 'debug')).toMatch(`Skipping ${escapedJSONPath} file`);
      expect(result.profiles).toHaveLength(2);
      expect(result.codeSystems).toHaveLength(0);
      expect(result.valueSets).toHaveLength(0);
      expect(result.extensions).toHaveLength(0);
      expect(result.instances).toHaveLength(2); // Only bad-publisher-files/expansions.json processed (not bad-publisher-files/output/expansions.json)
      expect(result.invariants).toHaveLength(0);
      expect(result.mappings).toHaveLength(0);
    });

    it('should not try to process files in output generated by the publisher that will hang when output is the specified path ', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'bad-publisher-files', 'output');
      const processor = await getFhirProcessor(inDir, loadTestDefinitions());
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      const expansionsPath = path.join(
        __dirname,
        'fixtures',
        'bad-publisher-files',
        'output',
        'expansions.json'
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getFirstMessage('debug')).toMatch(`Skipping ${expansionsPath} file`);
      expect(result.profiles).toHaveLength(1);
      expect(result.codeSystems).toHaveLength(0);
      expect(result.valueSets).toHaveLength(0);
      expect(result.extensions).toHaveLength(0);
      expect(result.instances).toHaveLength(0); // output/expansions.json not processed
      expect(result.invariants).toHaveLength(0);
      expect(result.mappings).toHaveLength(0);
    });

    it('should not try to process temp files if temp is a child of specified path', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'temp-files');
      const processor = await getFhirProcessor(inDir, loadTestDefinitions());
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getFirstMessage('debug')).toMatch(/Skipping temp folder/s);
      expect(result.profiles).toHaveLength(1); // Only profile in root is processed (not the ones in temp)
      expect(result.codeSystems).toHaveLength(0);
      expect(result.valueSets).toHaveLength(0);
      expect(result.extensions).toHaveLength(0);
      expect(result.instances).toHaveLength(0);
      expect(result.invariants).toHaveLength(0);
      expect(result.mappings).toHaveLength(0);
    });

    it('should process temp files if temp is at the end of specified path', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'temp-files', 'temp');
      const processor = await getFhirProcessor(inDir, loadTestDefinitions());
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      loggerSpy.getAllMessages('debug').forEach(m => {
        expect(m).not.toMatch(/Skipping temp folder/s);
      });
      expect(result.profiles).toHaveLength(2); // Profiles in temp are processed
      expect(result.codeSystems).toHaveLength(0);
      expect(result.valueSets).toHaveLength(0);
      expect(result.extensions).toHaveLength(0);
      expect(result.instances).toHaveLength(0);
      expect(result.invariants).toHaveLength(0);
      expect(result.mappings).toHaveLength(0);
    });

    it('should process temp files if temp is included in specified path', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'temp-files', 'temp', 'more-things');
      const processor = await getFhirProcessor(inDir, loadTestDefinitions());
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      loggerSpy.getAllMessages('debug').forEach(m => {
        expect(m).not.toMatch(/Skipping temp folder/s);
      });
      expect(result.profiles).toHaveLength(1); // Profile in temp/more-things are processed
      expect(result.codeSystems).toHaveLength(0);
      expect(result.valueSets).toHaveLength(0);
      expect(result.extensions).toHaveLength(0);
      expect(result.instances).toHaveLength(0);
      expect(result.invariants).toHaveLength(0);
      expect(result.mappings).toHaveLength(0);
    });

    it('should throw an error when the input directory does not exist', async () => {
      expect.assertions(1);
      const inDir = path.join(__dirname, 'wrong-fixtures');
      try {
        await getFhirProcessor(inDir, undefined);
      } catch (e) {
        expect(e.message).toMatch('no such file or directory');
      }
    });

    it('should not create duplicate inline instances', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'inline-instances');
      const processor = await getFhirProcessor(inDir, loadTestDefinitions());
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      expect(result.instances).toHaveLength(2);
      const bundle = result.instances.find(i => i.id === 'foo');
      const inlineInstanceRule = new ExportableAssignmentRule('entry[0].resource');
      inlineInstanceRule.isInstance = true;
      inlineInstanceRule.value = 'bar';
      expect(bundle.rules).toContainEqual(inlineInstanceRule);
      const patient = result.instances.find(i => i.id === 'bar');
      expect(patient.usage).toBe('Example');
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
      resources.add(new ExportableProfile('Foo'));
      writeFSH(resources, tempRoot, 'single-file');
      expect(fs.existsSync(path.join(tempRoot, 'input', 'fsh', 'resources.fsh'))).toBeTruthy();
    });

    it('should write output to files organized by category when style is by-category', () => {
      const resources = new Package();
      resources.add(new ExportableProfile('Foo'));
      resources.add(new ExportableInstance('Bar'));
      writeFSH(resources, tempRoot, 'by-category');
      expect(fs.existsSync(path.join(tempRoot, 'input', 'fsh', 'profiles.fsh'))).toBeTruthy();
      expect(fs.existsSync(path.join(tempRoot, 'input', 'fsh', 'instances.fsh'))).toBeTruthy();
    });

    it('should write output to files organized by category when style is undefined', () => {
      const resources = new Package();
      resources.add(new ExportableProfile('Foo'));
      resources.add(new ExportableInstance('Bar'));
      writeFSH(resources, tempRoot, undefined);
      expect(fs.existsSync(path.join(tempRoot, 'input', 'fsh', 'profiles.fsh'))).toBeTruthy();
      expect(fs.existsSync(path.join(tempRoot, 'input', 'fsh', 'instances.fsh'))).toBeTruthy();
    });

    it('should write configuration details to a file named sushi-config.yaml in the output directory', () => {
      const resources = new Package();
      const config = new ExportableConfiguration({ canonical: 'fakeCanonical', fhirVersion: [] });
      resources.add(config);
      writeFSH(resources, tempRoot, 'single-file');
      expect(fs.existsSync(path.join(tempRoot, 'sushi-config.yaml'))).toBeTruthy();
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

  describe('getIgPathFromIgIni', () => {
    it('should return the path to an IG pointed to by an ig.ini file', () => {
      const ig = getIgPathFromIgIni(path.join(__dirname, 'fixtures', 'ig-ini'));
      expect(ig).toEqual(
        path.join(__dirname, 'fixtures', 'ig-ini', 'ImplementationGuide-fsh.example.json')
      );
    });

    it('should return the path to an IG in a different directory than the ig.ini file', () => {
      const ig = getIgPathFromIgIni(path.join(__dirname, 'fixtures', 'nested-ig-ini'));
      expect(ig).toEqual(
        path.join(
          __dirname,
          'fixtures',
          'nested-ig-ini',
          'nested',
          'other',
          'ImplementationGuide-fsh.example.json'
        )
      );
    });

    it('should return nothing if no IG in ig.ini', () => {
      const ig = getIgPathFromIgIni(path.join(__dirname, 'fixtures', 'empty-ig-ini'));
      expect(ig).toBeUndefined();
    });

    it('should return nothing if no ig.ini file present', () => {
      const ig = getIgPathFromIgIni(path.join(__dirname, 'fixtures', 'all-good'));
      expect(ig).toBeUndefined();
    });
  });
});
