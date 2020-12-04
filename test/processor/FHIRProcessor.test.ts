import path from 'path';
import fs from 'fs-extra';
import {
  FHIRProcessor,
  ConfigurationProcessor,
  CodeSystemProcessor,
  StructureDefinitionProcessor,
  ValueSetProcessor,
  InstanceProcessor,
  LakeOfFHIR
} from '../../src/processor';
import { restockLake } from '../helpers';

describe('FHIRProcessor', () => {
  let processor: FHIRProcessor;
  let lake: LakeOfFHIR;
  let configurationSpy: jest.SpyInstance;
  let structureDefinitionSpy: jest.SpyInstance;
  let codeSystemSpy: jest.SpyInstance;
  let valueSetSpy: jest.SpyInstance;
  let instanceSpy: jest.SpyInstance;

  beforeAll(() => {
    configurationSpy = jest.spyOn(ConfigurationProcessor, 'process');
    structureDefinitionSpy = jest.spyOn(StructureDefinitionProcessor, 'process');
    codeSystemSpy = jest.spyOn(CodeSystemProcessor, 'process');
    valueSetSpy = jest.spyOn(ValueSetProcessor, 'process');
    instanceSpy = jest.spyOn(InstanceProcessor, 'process');
  });

  beforeEach(() => {
    lake = new LakeOfFHIR([]);
    processor = new FHIRProcessor(lake);
    configurationSpy.mockClear();
    structureDefinitionSpy.mockClear();
    codeSystemSpy.mockClear();
    valueSetSpy.mockClear();
    instanceSpy.mockClear();
  });

  it('should try to process an ImplementationGuide with the ConfigurationProcessor', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'simple-ig.json'));
    processor.processConfig();
    expect(configurationSpy).toHaveBeenCalledTimes(1);
    const simpleIgContent = fs.readJsonSync(path.join(__dirname, 'fixtures', 'simple-ig.json'));
    expect(configurationSpy).toHaveBeenCalledWith(simpleIgContent); // Uses first and only IG in lake if no path provided
  });

  it('should resolve version numbers between command lines deps and ImplementationGuide deps', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'bigger-ig.json'));
    const config = processor.processConfig(['hl7.fhir.us.core@2.1.0']);
    expect(configurationSpy).toHaveBeenCalledTimes(1);
    const biggerIgContent = fs.readJsonSync(path.join(__dirname, 'fixtures', 'bigger-ig.json'));
    expect(configurationSpy).toHaveBeenCalledWith(biggerIgContent); // Uses first and only IG in lake if no path provided
    expect(config.config.dependencies[0].version).toEqual('3.1.0');
  });

  it('should export a config file with command line dependencies', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'bigger-ig.json'));
    const config = processor.processConfig(['hl7.fhir.ha.haha@2.1.0']);
    expect(config.config.dependencies[2].packageId).toEqual('hl7.fhir.ha.haha');
  });

  it('should try to process a provided ImplementationGuide with the ConfigurationProcessor', () => {
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
    expect(configurationSpy).toHaveBeenCalledWith(biggerIgContent); // Uses path provided instead of first IG in lake
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
});
