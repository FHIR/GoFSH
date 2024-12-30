import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { Fhir } from 'fhir/fhir';
import readlineSync from 'readline-sync';
import { loggerSpy } from '../helpers/loggerSpy';
import {
  ensureOutputDir,
  getInputDir,
  getResources,
  loadConfiguredDependencies,
  writeFSH,
  getIgPathFromIgIni,
  getFhirProcessor,
  getLakeOfFHIR,
  readJSONorXML,
  getAliasFile
} from '../../src/utils/Processing';
import { Package } from '../../src/processor';
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';
import {
  ExportableConfiguration,
  ExportableInstance,
  ExportableProfile,
  ExportableAssignmentRule
} from '../../src/exportable';
import { FHIRDefinitions, loadExternalDependencies } from '../../src/utils';
import * as loadOptimizers from '../../src/optimizer/loadOptimizers';
import { FshCode } from 'fsh-sushi/dist/fshtypes';
import { LoadStatus } from 'fhir-package-loader';

let loadedPackages: string[] = [];

async function replacementLoadPackage(name: string, version: string): Promise<LoadStatus> {
  if (
    name === 'hl7.fhir.r4.core' ||
    name === 'hl7.fhir.us.core' ||
    name === 'hl7.fhir.r4b.core' ||
    name === 'hl7.fhir.r6.core'
  ) {
    loadedPackages.push(`${name}#${version}`);
    return Promise.resolve(LoadStatus.LOADED);
  } else {
    throw new Error();
  }
}

jest.mock('fsh-sushi', () => {
  const original = jest.requireActual('fsh-sushi');
  const newStyle = {
    ...original,
    utils: {
      ...original.utils,
      loadAutomaticDependencies: jest.fn(async () => {
        // this is just one of the usual automatic dependencies, as an example
        loadedPackages.push('hl7.terminology.r4#1.0.0');
        return Promise.resolve();
      })
    }
  };
  return newStyle;
});

describe('Processing', () => {
  temp.track();

  beforeAll(async () => {
    jest.spyOn(FHIRDefinitions.prototype, 'loadPackage').mockImplementation(replacementLoadPackage);
  });

  beforeEach(() => loggerSpy.reset());

  afterAll(() => {
    jest.restoreAllMocks();
  });

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
    let keyInSpy: jest.SpyInstance;

    beforeAll(() => {
      tempRoot = temp.mkdirSync('gofsh-test');
      keyInSpy = jest.spyOn(readlineSync, 'keyIn');
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    it('should use a directory named gofsh as a default when no directory is provided', () => {
      // First change working directory so we don't create/modify gofsh folder in the project
      const cwd = process.cwd();
      try {
        process.chdir(tempRoot);
        const result = ensureOutputDir(undefined);
        expect(result).toBe('gofsh');
        expect(loggerSpy.getLastMessage('info')).toBe(`Using output directory: ${result}`);
      } finally {
        // now change it back
        process.chdir(cwd);
      }
    });

    it('should use the provided directory when one is given', () => {
      const output = path.join(tempRoot, 'my-fsh');
      const result = ensureOutputDir(output);
      expect(result).toBe(output);
      expect(fs.existsSync(result)).toBeTruthy();
      expect(loggerSpy.getLastMessage('info')).toBe(`Using output directory: ${result}`);
    });

    it('should empty the provided output directory when the user responds delete', () => {
      const output = path.join(tempRoot, 'my-fsh-del');
      fs.createFileSync(path.join(output, 'something.json'));
      keyInSpy.mockImplementationOnce(() => 'D');
      const result = ensureOutputDir(output);
      expect(result).toBe(output);
      expect(fs.existsSync(result)).toBeTruthy();
      expect(fs.readdirSync(result)).toHaveLength(0);
    });

    it('should not empty the provided output directory when the user responds continue', () => {
      const output = path.join(tempRoot, 'my-fsh-con');
      fs.createFileSync(path.join(output, 'something.json'));
      keyInSpy.mockImplementationOnce(() => 'C');
      const result = ensureOutputDir(output);
      expect(result).toBe(output);
      expect(fs.existsSync(result)).toBeTruthy();
      expect(fs.readdirSync(result)).toHaveLength(1);
    });

    it('should return undefined when the user responds quit', () => {
      const output = path.join(tempRoot, 'my-fsh-quit');
      fs.createFileSync(path.join(output, 'something.json'));
      keyInSpy.mockImplementationOnce(() => 'Q');
      const result = ensureOutputDir(output);
      expect(result).toBeUndefined();
    });
  });

  describe('getResources', () => {
    it('should try to register each json file in the directory and its subdirectories when given a path to a directory', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'all-good');
      const processor = await getFhirProcessor(inDir, undefined, 'json-only');
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
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
      const processor = await getFhirProcessor(inDir, undefined, 'json-only');
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
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
      const processor = await getFhirProcessor(inDir, undefined, 'json-only');
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
      const processor = await getFhirProcessor(inDir, undefined, 'json-only');
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      expect(loggerSpy.getMessageAtIndex(0, 'debug')).toMatch(
        /Skipping non-FHIR input: .*non-fhir\.json/
      );
      expect(loggerSpy.getMessageAtIndex(1, 'debug')).toMatch(
        /Skipping validation outcome resource created by IG Publisher: .*validation-oo\.json/
      );
      expect(loggerSpy.getMessageAtIndex(2, 'debug')).toMatch(
        /Skipping temporary "comparison" resource created by IG Publisher: .*sd-us-core-observation-lab-mcode-cancer-disease-status-intersection\.json/
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(result.profiles).toHaveLength(1);
      expect(result.codeSystems).toHaveLength(0);
      expect(result.valueSets).toHaveLength(0);
      expect(result.extensions).toHaveLength(0);
      expect(result.instances).toHaveLength(0);
      expect(result.invariants).toHaveLength(0);
      expect(result.mappings).toHaveLength(0);
    });

    it('should log debug statements for valid XML that is not a valid FHIR resource', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'non-fhir-xml');
      const processor = await getFhirProcessor(inDir, undefined, 'xml-only');
      const config = processor.processConfig();
      await getResources(processor, config);
      expect(loggerSpy.getMessageAtIndex(0, 'debug')).toMatch(
        /Skipping non-FHIR XML: .*non-fhir\.xml/
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not try to process escaped JSON files or files generated by the publisher that will hang when output is a child of the specified path', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'bad-publisher-files');
      const testDefs = await loadTestDefinitions();
      const processor = await getFhirProcessor(inDir, testDefs, 'json-only');
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
      const testDefs = await loadTestDefinitions();
      const processor = await getFhirProcessor(inDir, testDefs, 'json-only');
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
      const testDefs = await loadTestDefinitions();
      const processor = await getFhirProcessor(inDir, testDefs, 'json-only');
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
      const testDefs = await loadTestDefinitions();
      const processor = await getFhirProcessor(inDir, testDefs, 'json-only');
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
      const testDefs = await loadTestDefinitions();
      const processor = await getFhirProcessor(inDir, testDefs, 'json-only');
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

    it('should ignore ig-r4 when it is in a specified path', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'ig-r4');
      const testDefs = await loadTestDefinitions();
      const processor = await getFhirProcessor(inDir, testDefs, 'json-only');
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
      expect(result.profiles).toHaveLength(1);
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
        await getFhirProcessor(inDir, undefined, 'json-only');
      } catch (e) {
        expect(e.message).toMatch('no such file or directory');
      }
    });

    it('should not create duplicate inline instances', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'inline-instances');
      const testDefs = await loadTestDefinitions();
      const processor = await getFhirProcessor(inDir, testDefs, 'json-only');
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      expect(result.instances).toHaveLength(2);
      const bundle = result.instances.find(i => i.id === 'foo');
      const inlineInstanceRule = new ExportableAssignmentRule('entry.resource');
      inlineInstanceRule.isInstance = true;
      inlineInstanceRule.value = 'bar';
      expect(bundle.rules).toContainEqual(inlineInstanceRule);
      const patient = result.instances.find(i => i.id === 'bar');
      expect(patient.usage).toBe('Example');
    });

    it('should not combine rules on contained ValueSet.compose.include.concept', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'contained-valueset');
      const testDefs = await loadTestDefinitions();
      const processor = await getFhirProcessor(inDir, testDefs, 'json-only');
      const config = processor.processConfig();
      const result = await getResources(processor, config);
      expect(result.instances).toHaveLength(2);
      const inlineVS = result.instances.find(i => i.id === 'MyInlineVS');
      expect(inlineVS?.usage).toBe('Inline');
      // * status = #active
      // * compose.include.system = "http://example.org"
      // * compose.include.concept[0].code = #123
      // * compose.include.concept[=].display = "one two three"
      // * compose.include.concept[+].code = #456
      // * compose.include.concept[=].display = "four five six"
      const statusRule = new ExportableAssignmentRule('status');
      statusRule.value = new FshCode('active');
      const systemRule = new ExportableAssignmentRule('compose.include.system');
      systemRule.value = 'http://example.org';
      const code0 = new ExportableAssignmentRule('compose.include.concept[0].code');
      code0.value = new FshCode('123');
      const display0 = new ExportableAssignmentRule('compose.include.concept[=].display');
      display0.value = 'one two three';
      const code1 = new ExportableAssignmentRule('compose.include.concept[+].code');
      code1.value = new FshCode('456');
      const display1 = new ExportableAssignmentRule('compose.include.concept[=].display');
      display1.value = 'four five six';
      expect(inlineVS.rules).toEqual([statusRule, systemRule, code0, display0, code1, display1]);
    });

    describe('#enableOptimizers', () => {
      beforeEach(() => {
        // mock the call to loadOptimizers so that we get a custom set
        jest.spyOn(loadOptimizers, 'loadOptimizers').mockImplementationOnce(async () => {
          const enablePath = path.join(__dirname, 'fixtures', 'with-enable');
          return await loadOptimizers.loadOptimizers(enablePath);
        });
      });

      it('should run optimizers without an isEnabled function or when their isEnabled function returns true', async () => {
        // the actual resources being collected don't really matter for this test.
        const inDir = path.join(__dirname, 'fixtures', 'all-good');
        const processor = await getFhirProcessor(inDir, undefined, 'json-only');
        const config = processor.processConfig();
        await getResources(processor, config, { aName: 'A', bFlag: true });
        const infoMessages = loggerSpy.getAllMessages('info');
        expect(infoMessages).toContainEqual('Running optimizer a: A Optimizer');
        expect(infoMessages).toContainEqual('Running optimizer b: B Optimizer');
        expect(infoMessages).toContainEqual('Running optimizer c: C Optimizer');
      });

      it('should not run optimizers with an isEnabled function when that function returns false', async () => {
        // the actual resources being collected don't really matter for this test.
        const inDir = path.join(__dirname, 'fixtures', 'all-good');
        const processor = await getFhirProcessor(inDir, undefined, 'json-only');
        const config = processor.processConfig();
        await getResources(processor, config, { aName: 'Z' });
        const infoMessages = loggerSpy.getAllMessages('info');
        const debugMessages = loggerSpy.getAllMessages('debug');
        expect(debugMessages).toContainEqual('Skipping optimizer a: A Optimizer');
        expect(debugMessages).toContainEqual('Skipping optimizer b: B Optimizer');
        expect(infoMessages).toContainEqual('Running optimizer c: C Optimizer');
      });
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

    it('should write output to files organized by category when style is group-by-fsh-type', () => {
      const resources = new Package();
      resources.add(new ExportableProfile('Foo'));
      resources.add(new ExportableInstance('Bar'));
      writeFSH(resources, tempRoot, 'group-by-fsh-type');
      expect(fs.existsSync(path.join(tempRoot, 'input', 'fsh', 'profiles.fsh'))).toBeTruthy();
      expect(fs.existsSync(path.join(tempRoot, 'input', 'fsh', 'instances.fsh'))).toBeTruthy();
    });

    it('should write output to files organized by category when style is undefined', () => {
      const resources = new Package();
      resources.add(new ExportableProfile('Foo'));
      resources.add(new ExportableInstance('Bar'));
      writeFSH(resources, tempRoot, undefined);
      expect(
        fs.existsSync(path.join(tempRoot, 'input', 'fsh', 'profiles', 'Foo.fsh'))
      ).toBeTruthy();
      expect(
        fs.existsSync(path.join(tempRoot, 'input', 'fsh', 'instances', 'Bar.fsh'))
      ).toBeTruthy();
    });

    it('should write configuration details to a file named sushi-config.yaml in the output directory', () => {
      const resources = new Package();
      const config = new ExportableConfiguration({ canonical: 'fakeCanonical', fhirVersion: [] });
      resources.add(config);
      writeFSH(resources, tempRoot, 'single-file');
      expect(fs.existsSync(path.join(tempRoot, 'sushi-config.yaml'))).toBeTruthy();
    });
  });

  describe('readJSONorXML', () => {
    it('should return a FileImport object with the "large" property set to true for big files', () => {
      const JSONFilePath = path.join(
        __dirname,
        'fixtures',
        'instance-files',
        'large-instance.json'
      );
      const XMLFilePath = path.join(__dirname, 'fixtures', 'instance-files', 'large-instance.xml');

      const jsonFileImport = readJSONorXML(JSONFilePath);
      const xmlFileImport = readJSONorXML(XMLFilePath);

      expect(jsonFileImport.large).toEqual(true);
      expect(xmlFileImport.large).toEqual(true);
    });

    it('should return a FileImport object with the "large" property set to false for small files', () => {
      const JSONFilePath = path.join(__dirname, 'fixtures', 'only-json', 'patient.json');
      const XMLFilePath = path.join(__dirname, 'fixtures', 'only-xml', 'patient.xml');

      const jsonFileImport = readJSONorXML(JSONFilePath);
      const xmlFileImport = readJSONorXML(XMLFilePath);

      expect(jsonFileImport.large).toBeUndefined();
      expect(xmlFileImport.large).toBeUndefined();
    });

    it('should properly read json and xml files', () => {
      const FHIRProcessor = new Fhir();

      const JSONFilePath = path.join(__dirname, 'fixtures', 'only-json', 'patient.json');
      const XMLFilePath = path.join(__dirname, 'fixtures', 'only-xml', 'patient.xml');

      const jsonFileImport = readJSONorXML(JSONFilePath);
      const xmlFileImport = readJSONorXML(XMLFilePath);

      expect(jsonFileImport.content).toEqual(fs.readJSONSync(JSONFilePath));
      expect(xmlFileImport.content).toEqual(
        FHIRProcessor.xmlToObj(fs.readFileSync(XMLFilePath).toString())
      );
    });

    it('should not log an error when JSON files begin with a Byte Order Mark', () => {
      const JSONFilePath = path.join(__dirname, 'fixtures', 'with-BOM', 'badBOM.json');

      const jsonFileImport = readJSONorXML(JSONFilePath);
      expect(jsonFileImport.content).toEqual(fs.readJSONSync(JSONFilePath));
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });
  });

  describe('getAliasFile', () => {
    beforeEach(() => {
      loggerSpy.reset();
    });

    it('should get specified alias file', () => {
      const programAliasFile = 'alias.fsh';
      const aliasFile = getAliasFile(programAliasFile);
      return Promise.all(aliasFile).then(() => {
        expect(aliasFile).toBe(programAliasFile);
        expect(loggerSpy.getLastMessage('info')).toMatch('Using alias file: ' + programAliasFile);
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });
    });
  });

  describe('loadExternalDependencies', () => {
    beforeEach(() => {
      loggerSpy.reset();
      loadedPackages = [];
    });

    it('should load automatic and configured dependencies', async () => {
      const config = new ExportableConfiguration({
        FSHOnly: true,
        canonical: 'http://example.org',
        fhirVersion: ['4.0.1'],
        id: 'example',
        name: 'Example',
        applyExtensionMetadataToRoot: false,
        dependencies: [{ packageId: 'hl7.fhir.us.core', version: '3.1.0' }]
      });
      const defs = new FHIRDefinitions();
      await loadExternalDependencies(defs, config);
      expect(loadedPackages).toHaveLength(3);
      expect(loadedPackages).toContain('hl7.fhir.r4.core#4.0.1');
      expect(loadedPackages).toContain('hl7.fhir.us.core#3.1.0');
      expect(loadedPackages).toContain('hl7.terminology.r4#1.0.0');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should load FHIR R4B when specified in config fhirVersion', async () => {
      const config = new ExportableConfiguration({
        FSHOnly: true,
        canonical: 'http://example.org',
        fhirVersion: ['4.3.0'],
        id: 'example',
        name: 'Example',
        applyExtensionMetadataToRoot: false,
        dependencies: [{ packageId: 'hl7.fhir.us.core', version: '3.1.0' }]
      });
      const defs = new FHIRDefinitions();
      await loadExternalDependencies(defs, config);
      expect(loadedPackages).toHaveLength(3);
      expect(loadedPackages).toContain('hl7.fhir.r4b.core#4.3.0');
      expect(loadedPackages).toContain('hl7.fhir.us.core#3.1.0');
      expect(loadedPackages).toContain('hl7.terminology.r4#1.0.0');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should load FHIR R6 prerelease when specified in config fhirVersion', async () => {
      const config = new ExportableConfiguration({
        FSHOnly: true,
        canonical: 'http://example.org',
        fhirVersion: ['6.0.0-ballot2'],
        id: 'example',
        name: 'Example',
        applyExtensionMetadataToRoot: false,
        dependencies: [{ packageId: 'hl7.fhir.us.core', version: '3.1.0' }]
      });
      const defs = new FHIRDefinitions();
      await loadExternalDependencies(defs, config);
      expect(loadedPackages).toHaveLength(3);
      expect(loadedPackages).toContain('hl7.fhir.r6.core#6.0.0-ballot2');
      expect(loadedPackages).toContain('hl7.fhir.us.core#3.1.0');
      expect(loadedPackages).toContain('hl7.terminology.r4#1.0.0');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should load FHIR R6 official release when specified in config fhirVersion', async () => {
      const config = new ExportableConfiguration({
        FSHOnly: true,
        canonical: 'http://example.org',
        fhirVersion: ['6.0.0'],
        id: 'example',
        name: 'Example',
        applyExtensionMetadataToRoot: false,
        dependencies: [{ packageId: 'hl7.fhir.us.core', version: '3.1.0' }]
      });
      const defs = new FHIRDefinitions();
      await loadExternalDependencies(defs, config);
      expect(loadedPackages).toHaveLength(3);
      expect(loadedPackages).toContain('hl7.fhir.r6.core#6.0.0');
      expect(loadedPackages).toContain('hl7.fhir.us.core#3.1.0');
      expect(loadedPackages).toContain('hl7.terminology.r4#1.0.0');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not add the identified FHIR core package to the list of dependencies when it is already there', async () => {
      const config = new ExportableConfiguration({
        FSHOnly: true,
        canonical: 'http://example.org',
        fhirVersion: ['4.0.1'],
        id: 'example',
        name: 'Example',
        applyExtensionMetadataToRoot: false,
        dependencies: [
          { packageId: 'hl7.fhir.us.core', version: '3.1.0' },
          { packageId: 'hl7.fhir.r4.core', version: '4.0.1' }
        ]
      });
      const defs = new FHIRDefinitions();
      await loadExternalDependencies(defs, config);
      // the core FHIR package is only present once in the list
      expect(loadedPackages).toHaveLength(3);
      expect(loadedPackages).toContain('hl7.fhir.r4.core#4.0.1');
      expect(loadedPackages).toContain('hl7.fhir.us.core#3.1.0');
      expect(loadedPackages).toContain('hl7.terminology.r4#1.0.0');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });
  });

  describe('loadConfiguredDependencies', () => {
    beforeEach(() => {
      loggerSpy.reset();
      loadedPackages = [];
    });

    it('should load specified dependencies', () => {
      const defs = new FHIRDefinitions();
      const dependencies = ['hl7.fhir.us.core@3.1.0'];
      const dependencyDefs = loadConfiguredDependencies(defs, dependencies);
      return dependencyDefs.then(() => {
        expect(loadedPackages).toHaveLength(2);
        expect(loadedPackages).toContain('hl7.fhir.r4.core#4.0.1');
        expect(loadedPackages).toContain('hl7.fhir.us.core#3.1.0');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });
    });

    it('should log an error when it fails to load a dependency', () => {
      const defs = new FHIRDefinitions();
      const badDependencies = ['hl7.does.not.exist@current'];
      const dependencyDefs = loadConfiguredDependencies(defs, badDependencies);
      return dependencyDefs.then(() => {
        expect(loadedPackages).toHaveLength(1);
        expect(loadedPackages).toContain('hl7.fhir.r4.core#4.0.1');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Failed to load hl7\.does\.not\.exist#current/s
        );
      });
    });

    it('should log an error when a dependency has no specified version', () => {
      const defs = new FHIRDefinitions();
      const badDependencies = ['hl7.fhir.us.core']; // No version
      const dependencyDefs = loadConfiguredDependencies(defs, badDependencies);
      return dependencyDefs.then(() => {
        expect(loadedPackages).toHaveLength(1);
        expect(loadedPackages).toContain('hl7.fhir.r4.core#4.0.1');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
        expect(loggerSpy.getLastMessage('error')).toMatch(
          /Failed to load hl7\.fhir\.us\.core: No version specified\./s
        );
      });
    });

    it('should load only FHIR if no dependencies specified', () => {
      const defs = new FHIRDefinitions();
      // No dependencies specified on CLI will pass in undefined
      const dependencyDefs = loadConfiguredDependencies(defs, undefined);
      return dependencyDefs.then(() => {
        expect(loadedPackages).toHaveLength(1);
        expect(loadedPackages).toContain('hl7.fhir.r4.core#4.0.1');
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });
    });

    it('should load FHIR R4B if specified', () => {
      const defs = new FHIRDefinitions();
      const dependencies = ['hl7.fhir.r4b.core@4.3.0-snapshot1'];
      const dependencyDefs = loadConfiguredDependencies(defs, dependencies);
      return dependencyDefs.then(() => {
        expect(loadedPackages).toHaveLength(1);
        expect(loadedPackages).toContain('hl7.fhir.r4b.core#4.3.0-snapshot1'); // Only contains r4b, doesn't load r4
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });
    });

    it('should load FHIR R6 prerelease if specified', () => {
      const defs = new FHIRDefinitions();
      const dependencies = ['hl7.fhir.r6.core@6.0.0-ballot2'];
      const dependencyDefs = loadConfiguredDependencies(defs, dependencies);
      return dependencyDefs.then(() => {
        expect(loadedPackages).toHaveLength(1);
        expect(loadedPackages).toContain('hl7.fhir.r6.core#6.0.0-ballot2'); // Only contains r6, doesn't load r4
        expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      });
    });

    it('should load FHIR R6 if specified', () => {
      const defs = new FHIRDefinitions();
      const dependencies = ['hl7.fhir.r6.core@6.0.0'];
      const dependencyDefs = loadConfiguredDependencies(defs, dependencies);
      return dependencyDefs.then(() => {
        expect(loadedPackages).toHaveLength(1);
        expect(loadedPackages).toContain('hl7.fhir.r6.core#6.0.0'); // Only contains r6, doesn't load r4
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

  describe('getFhirProcessor', () => {
    let fixtures: string;

    beforeAll(() => {
      fixtures = path.join(__dirname, 'fixtures');
    });

    beforeEach(() => {
      loggerSpy.reset();
    });

    it('should load JSON in "json-only" mode from a directory containing only JSON', () => {
      const lake = getLakeOfFHIR(path.join(fixtures, 'only-json'), 'json-only');
      expect(lake.docs).toHaveLength(2);
      expect(lake.docs[0].content.id).toBe('json-observation');
      expect(lake.docs[1].content.id).toBe('json-patient');
      expect(loggerSpy.getLastMessage('info')).toMatch(/Found 2 JSON files\./);
      expect(loggerSpy.getLastMessage('warn')).toBeUndefined();
    });

    it('should load JSON in "json-only" mode from a directory containing JSON and duplicate XML', () => {
      const lake = getLakeOfFHIR(path.join(fixtures, 'json-and-xml-duplicates'), 'json-only');
      expect(lake.docs).toHaveLength(2);
      expect(lake.docs[0].content.id).toBe('some-observation');
      expect(lake.docs[1].content.id).toBe('some-patient');
      expect(loggerSpy.getLastMessage('info')).toMatch(/Found 2 JSON files\./);
      expect(loggerSpy.getLastMessage('warn')).toBeUndefined();
    });

    it('should load JSON and log a warning in "json-only" mode from a directory containing JSON and non-duplicate XML', () => {
      const lake = getLakeOfFHIR(path.join(fixtures, 'json-and-xml-non-duplicates'), 'json-only');
      expect(lake.docs).toHaveLength(2);
      expect(lake.docs[0].content.id).toBe('json-observation');
      expect(lake.docs[1].content.id).toBe('json-patient');
      expect(loggerSpy.getLastMessage('info')).toMatch(/Found 2 JSON files\./);
      expect(loggerSpy.getLastMessage('warn')).toMatch(/2 XML definition\(s\).*observation\.xml/);
    });

    it('should load JSON in "json-only" mode from a directory containing JSON and non-FHIR XML', () => {
      const lake = getLakeOfFHIR(path.join(fixtures, 'json-and-non-fhir-xml'), 'json-only');
      expect(lake.docs).toHaveLength(2);
      expect(lake.docs[0].content.id).toBe('json-observation');
      expect(lake.docs[1].content.id).toBe('json-patient');
      expect(loggerSpy.getLastMessage('info')).toMatch(/Found 2 JSON files\./);
      expect(loggerSpy.getLastMessage('warn')).toBeUndefined();
    });

    it('should load XML in "xml-only" mode from a directory containing only XML', () => {
      const lake = getLakeOfFHIR(path.join(fixtures, 'only-xml'), 'xml-only');
      expect(lake.docs).toHaveLength(2);
      expect(lake.docs[0].content.id).toBe('xml-observation');
      expect(lake.docs[1].content.id).toBe('xml-patient');
      expect(loggerSpy.getLastMessage('info')).toMatch(/Found 2 XML files\./);
      expect(loggerSpy.getLastMessage('warn')).toBeUndefined();
    });

    it('should load XML in "xml-only" mode from a directory containing XML and duplicate JSON', () => {
      const lake = getLakeOfFHIR(path.join(fixtures, 'json-and-xml-duplicates'), 'xml-only');
      expect(lake.docs).toHaveLength(2);
      expect(lake.docs[0].content.id).toBe('some-observation');
      expect(lake.docs[1].content.id).toBe('some-patient');
      expect(loggerSpy.getLastMessage('info')).toMatch(/Found 2 XML files\./);
      expect(loggerSpy.getLastMessage('warn')).toBeUndefined();
    });

    it('should load XML and log a warning in "xml-only" mode from a directory containing XML and non-duplicate JSON', () => {
      const lake = getLakeOfFHIR(path.join(fixtures, 'json-and-xml-non-duplicates'), 'xml-only');
      expect(lake.docs).toHaveLength(2);
      expect(lake.docs[0].content.id).toBe('xml-observation');
      expect(lake.docs[1].content.id).toBe('xml-patient');
      expect(loggerSpy.getLastMessage('info')).toMatch(/Found 2 XML files\./);
      expect(loggerSpy.getLastMessage('warn')).toMatch(/2 JSON definition\(s\).*observation\.json/);
    });

    it('should load XML and JSON in "json-and-xml" mode', () => {
      const lake = getLakeOfFHIR(
        path.join(fixtures, 'json-and-xml-non-duplicates'),
        'json-and-xml'
      );
      expect(lake.docs).toHaveLength(4);
      expect(lake.docs[0].content.id).toBe('json-observation');
      expect(lake.docs[1].content.id).toBe('json-patient');
      expect(lake.docs[2].content.id).toBe('xml-observation');
      expect(lake.docs[3].content.id).toBe('xml-patient');
      expect(loggerSpy.getMessageAtIndex(-2, 'info')).toMatch(/Found 2 JSON files\./);
      expect(loggerSpy.getMessageAtIndex(-1, 'info')).toMatch(/Found 2 XML files\./);
      expect(loggerSpy.getLastMessage('warn')).toBeUndefined();
    });

    it('should log "file" in singular tense when directory contains 1 JSON file and/or 1 XML file', () => {
      const lake = getLakeOfFHIR(
        path.join(fixtures, 'json-and-xml-non-duplicates-singular'),
        'json-and-xml'
      );
      expect(lake.docs).toHaveLength(2);
      expect(lake.docs[0].content.id).toBe('json-observation');
      expect(lake.docs[1].content.id).toBe('xml-observation');
      expect(loggerSpy.getMessageAtIndex(-2, 'info')).toMatch(/Found 1 JSON file\./);
      expect(loggerSpy.getMessageAtIndex(-1, 'info')).toMatch(/Found 1 XML file\./);
      expect(loggerSpy.getLastMessage('warn')).toBeUndefined();
    });
  });
});
