import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { Fhir } from 'fhir/fhir';
import readlineSync from 'readline-sync';
import { fhirdefs } from 'fsh-sushi';
import { loggerSpy } from '../helpers/loggerSpy';
import {
  ensureOutputDir,
  getInputDir,
  getResources,
  loadExternalDependencies,
  writeFSH,
  getIgPathFromIgIni,
  getFhirProcessor,
  getLakeOfFHIR,
  readJSONorXML
} from '../../src/utils/Processing';
import { Package } from '../../src/processor';
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';
import {
  ExportableConfiguration,
  ExportableInstance,
  ExportableProfile,
  ExportableAssignmentRule
} from '../../src/exportable';

jest.mock('fsh-sushi', () => {
  const original = jest.requireActual('fsh-sushi');
  const newStyle = {
    ...original,
    fhirdefs: {
      ...original.fhirdefs
    }
  };
  newStyle.fhirdefs.loadDependency = async (
    packageName: string,
    version: string,
    FHIRDefs: any
  ) => {
    // the mock loader can find hl7.fhir.r4.core and hl7.fhir.us.core
    if (packageName === 'hl7.fhir.r4.core' || packageName === 'hl7.fhir.us.core') {
      FHIRDefs.packages.push(`${packageName}#${version}`);
      return Promise.resolve(FHIRDefs);
    } else {
      throw new Error();
    }
  };
  return newStyle;
});

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
    beforeEach(() => loggerSpy.reset());

    it('should try to register each json file in the directory and its subdirectories when given a path to a directory', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'all-good');
      const processor = await getFhirProcessor(inDir, undefined, 'json-only');
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
      const processor = await getFhirProcessor(inDir, undefined, 'json-only');
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
      const processor = await getFhirProcessor(inDir, loadTestDefinitions(), 'json-only');
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
      const processor = await getFhirProcessor(inDir, loadTestDefinitions(), 'json-only');
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
      const processor = await getFhirProcessor(inDir, loadTestDefinitions(), 'json-only');
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
      const processor = await getFhirProcessor(inDir, loadTestDefinitions(), 'json-only');
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
      const processor = await getFhirProcessor(inDir, loadTestDefinitions(), 'json-only');
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
        await getFhirProcessor(inDir, undefined, 'json-only');
      } catch (e) {
        expect(e.message).toMatch('no such file or directory');
      }
    });

    it('should not create duplicate inline instances', async () => {
      const inDir = path.join(__dirname, 'fixtures', 'inline-instances');
      const processor = await getFhirProcessor(inDir, loadTestDefinitions(), 'json-only');
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
  });

  describe('loadExternalDependencies', () => {
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
  });
});
