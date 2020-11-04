import path from 'path';
import {
  FHIRProcessor,
  ConfigurationProcessor,
  CodeSystemProcessor,
  StructureDefinitionProcessor,
  ValueSetProcessor
} from '../../src/processor';
import { fhirdefs } from 'fsh-sushi';
import { loggerSpy } from '../helpers/loggerSpy';
import { InstanceProcessor } from '../../src/processor/InstanceProcessor';

describe('FHIRProcessor', () => {
  let processor: FHIRProcessor;
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
    processor = new FHIRProcessor(new fhirdefs.FHIRDefinitions());
    configurationSpy.mockClear();
    structureDefinitionSpy.mockClear();
    codeSystemSpy.mockClear();
    valueSetSpy.mockClear();
    instanceSpy.mockClear();
  });

  it('should try to process an ImplementationGuide with the ConfigurationProcessor', () => {
    processor.register(path.join(__dirname, 'fixtures', 'simple-ig.json'));
    processor.process();
    expect(configurationSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process a Profile with the StructureDefinitionProcessor', () => {
    processor.register(path.join(__dirname, 'fixtures', 'simple-profile.json'));
    processor.process();
    expect(structureDefinitionSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process an Extension with the StructureDefinitionProcessor', () => {
    processor.register(path.join(__dirname, 'fixtures', 'simple-extension.json'));
    processor.process();
    expect(structureDefinitionSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process a CodeSystem with the CodeSystemProcessor', () => {
    processor.register(path.join(__dirname, 'fixtures', 'simple-codesystem.json'));
    processor.process();
    expect(codeSystemSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process a ValueSet with the ValueSetProcessor', () => {
    processor.register(path.join(__dirname, 'fixtures', 'simple-valueset.json'));
    processor.process();
    expect(valueSetSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process an Instance with the InstanceProcessor', () => {
    processor.register(path.join(__dirname, 'fixtures', 'simple-patient.json'));
    processor.process();
    expect(instanceSpy).toHaveBeenCalledTimes(1);
  });

  it('should log a warning when the input JSON does not have a resourceType', () => {
    processor.register(path.join(__dirname, 'fixtures', 'unsupported-resource.json'));
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /Skipping unsupported resource:.*unsupported-resource\.json/s
    );
  });

  it('should throw an error when the input path does not refer to a file', () => {
    expect(() => {
      processor.register(path.join(__dirname, 'fixtures', 'wrong-path.json'));
      processor.process();
    }).toThrow();
  });

  it('should throw an error when the input file is not valid JSON', () => {
    expect(() => {
      processor.register(path.join(__dirname, 'invalid-fixtures', 'invalid-profile.json'));
      processor.process();
    }).toThrow();
  });
});
