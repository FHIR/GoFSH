import path from 'path';
import fs from 'fs-extra';
import {
  FHIRProcessor,
  CodeSystemProcessor,
  StructureDefinitionProcessor,
  ValueSetProcessor,
  InstanceProcessor,
  LakeOfFHIR,
  WildFHIR,
  FileImport
} from '../../src/processor';
import { ConfigurationExtractor } from '../../src/extractor';
import { restockLake, loggerSpy } from '../helpers';
import { FHIRDefinitions, MasterFisher } from '../../src/utils';

describe('FHIRProcessor', () => {
  let processor: FHIRProcessor;
  let lake: LakeOfFHIR;
  let defs: FHIRDefinitions;
  let fisher: MasterFisher;
  let configurationSpy: jest.SpyInstance;
  let structureDefinitionSpy: jest.SpyInstance;
  let codeSystemSpy: jest.SpyInstance;
  let valueSetSpy: jest.SpyInstance;
  let instanceSpy: jest.SpyInstance;

  beforeAll(() => {
    configurationSpy = jest.spyOn(ConfigurationExtractor, 'process');
    structureDefinitionSpy = jest.spyOn(StructureDefinitionProcessor, 'process');
    codeSystemSpy = jest.spyOn(CodeSystemProcessor, 'process');
    valueSetSpy = jest.spyOn(ValueSetProcessor, 'process');
    instanceSpy = jest.spyOn(InstanceProcessor, 'process');
  });

  beforeEach(async () => {
    lake = new LakeOfFHIR([]);
    defs = new FHIRDefinitions();
    await defs.initialize();
    fisher = new MasterFisher(lake, defs);
    processor = new FHIRProcessor(lake, fisher);
    configurationSpy.mockClear();
    structureDefinitionSpy.mockClear();
    codeSystemSpy.mockClear();
    valueSetSpy.mockClear();
    instanceSpy.mockClear();
    loggerSpy.reset();
  });

  it('should try to extract configuration from an ImplementationGuide with the ConfigurationExtractor', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'simple-ig.json'));
    processor.processConfig();
    expect(configurationSpy).toHaveBeenCalledTimes(1);
    const simpleIgContent = fs.readJsonSync(path.join(__dirname, 'fixtures', 'simple-ig.json'));
    expect(configurationSpy).toHaveBeenCalledWith([simpleIgContent], undefined); // Uses first and only IG in lake if no path provided
  });

  it('should resolve version numbers between command lines deps and ImplementationGuide deps', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'bigger-ig.json'));
    const config = processor.processConfig(['hl7.fhir.us.core@2.1.0']);
    expect(configurationSpy).toHaveBeenCalledTimes(1);
    const biggerIgContent = fs.readJsonSync(path.join(__dirname, 'fixtures', 'bigger-ig.json'));
    expect(configurationSpy).toHaveBeenCalledWith([biggerIgContent], undefined); // Uses first and only IG in lake if no path provided
    expect(config.config.dependencies[0].version).toEqual('3.1.0');
  });

  it('should export a config file with command line dependencies', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'bigger-ig.json'));
    const config = processor.processConfig(['hl7.fhir.ha.haha@2.1.0']);
    expect(config.config.dependencies[2].packageId).toEqual('hl7.fhir.ha.haha');
  });

  it('should try to extract a provided ImplementationGuide with the ConfigurationExtractor', () => {
    restockLake(
      lake,
      path.join(__dirname, 'fixtures', 'simple-ig.json'),
      path.join(__dirname, 'fixtures', 'bigger-ig.json')
    );
    const processorWithIg = new FHIRProcessor(
      lake,
      null,
      path.join(__dirname, 'fixtures', 'bigger-ig.json')
    );
    processorWithIg.processConfig();
    expect(configurationSpy).toHaveBeenCalledTimes(1);
    const biggerIgContent = fs.readJsonSync(path.join(__dirname, 'fixtures', 'bigger-ig.json'));
    expect(configurationSpy).toHaveBeenCalledWith([biggerIgContent], undefined); // Uses path provided instead of first IG in lake
  });

  it('should try to process a Profile with the StructureDefinitionProcessor', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'simple-profile.json'));
    const config = processor.processConfig();
    processor.process(config);
    expect(structureDefinitionSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process an Extension with the StructureDefinitionProcessor', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'simple-extension.json'));
    const config = processor.processConfig();
    processor.process(config);
    expect(structureDefinitionSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process a supported CodeSystem with the CodeSystemProcessor', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'simple-codesystem.json'));
    const config = processor.processConfig();
    processor.process(config);
    expect(codeSystemSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process a supported ValueSet with the ValueSetProcessor', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'simple-valueset.json'));
    const config = processor.processConfig();
    processor.process(config);
    expect(valueSetSpy).toHaveBeenCalledTimes(1);
    expect(instanceSpy).not.toHaveBeenCalled();
  });

  it('should try to process a non-IG/SD/VS/CS Instance with the InstanceProcessor', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'simple-patient.json'));
    const config = processor.processConfig();
    processor.process(config);
    expect(instanceSpy).toHaveBeenCalledTimes(1);
    expect(valueSetSpy).not.toHaveBeenCalled();
    expect(codeSystemSpy).not.toHaveBeenCalled();
  });

  it('should try to process an unsupported ValueSet with the InstanceProcessor', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'unsupported-valueset.json'));
    const config = processor.processConfig();
    processor.process(config);
    expect(instanceSpy).toHaveBeenCalledTimes(1);
    expect(valueSetSpy).not.toHaveBeenCalled();
  });

  it('should try to process an unsupported CodeSystem with the InstanceProcessor', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'unsupported-codesystem.json'));
    const config = processor.processConfig();
    processor.process(config);
    expect(instanceSpy).toHaveBeenCalledTimes(1);
    expect(codeSystemSpy).not.toHaveBeenCalled();
  });

  it('should log an info message when processing an instance doc with the "large" property', () => {
    const instancePath = path.join(__dirname, 'fixtures', 'large-instance.json');
    const largeDoc: FileImport = { content: fs.readJsonSync(instancePath), large: true };
    lake.docs.push(new WildFHIR(largeDoc, instancePath));

    const config = processor.processConfig();
    processor.process(config);

    expect(loggerSpy.getLastMessage('info')).toMatch(
      'Instance large-instance is especially large. Processing may take a while.'
    );
  });

  it('should be able to handle a specified FHIR version when extracting ImplementationGuide from ConfigurationGenerator', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'bigger-ig.json'));
    const config = processor.processConfig(['hl7.fhir.us.core@2.1.0'], '5.0.0');
    expect(config.config.fhirVersion).toEqual(['5.0.0']);
  });
});
