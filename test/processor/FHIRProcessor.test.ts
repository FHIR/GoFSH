import path from 'path';
import {
  FHIRProcessor,
  ConfigurationProcessor,
  CodeSystemProcessor,
  StructureDefinitionProcessor,
  ValueSetProcessor,
  LakeOfFHIR
} from '../../src/processor';
import { loggerSpy, restockLake } from '../helpers';

describe('FHIRProcessor', () => {
  let processor: FHIRProcessor;
  let lake: LakeOfFHIR;
  let configurationSpy: jest.SpyInstance;
  let structureDefinitionSpy: jest.SpyInstance;
  let codeSystemSpy: jest.SpyInstance;
  let valueSetSpy: jest.SpyInstance;

  beforeAll(() => {
    configurationSpy = jest.spyOn(ConfigurationProcessor, 'process');
    structureDefinitionSpy = jest.spyOn(StructureDefinitionProcessor, 'process');
    codeSystemSpy = jest.spyOn(CodeSystemProcessor, 'process');
    valueSetSpy = jest.spyOn(ValueSetProcessor, 'process');
  });

  beforeEach(() => {
    lake = new LakeOfFHIR([]);
    processor = new FHIRProcessor(lake);
    configurationSpy.mockClear();
    structureDefinitionSpy.mockClear();
    codeSystemSpy.mockClear();
    valueSetSpy.mockClear();
  });

  it('should try to process an ImplementationGuide with the ConfigurationProcessor', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'simple-ig.json'));
    processor.process();
    expect(configurationSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process a Profile with the StructureDefinitionProcessor', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'simple-profile.json'));
    processor.process();
    expect(structureDefinitionSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process an Extension with the StructureDefinitionProcessor', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'simple-extension.json'));
    processor.process();
    expect(structureDefinitionSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process a CodeSystem with the CodeSystemProcessor', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'simple-codesystem.json'));
    processor.process();
    expect(codeSystemSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process a ValueSet with the ValueSetProcessor', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'simple-valueset.json'));
    processor.process();
    expect(valueSetSpy).toHaveBeenCalledTimes(1);
  });

  it('should log a warning when the input JSON does not have a recognized resourceType', () => {
    restockLake(lake, path.join(__dirname, 'fixtures', 'unsupported-resource.json'));
    processor.process();
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /Skipping unsupported resource:.*unsupported-resource\.json/s
    );
  });
});
