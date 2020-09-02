import path from 'path';
import {
  ProfileProcessor,
  ExtensionProcessor,
  FHIRProcessor,
  CodeSystemProcessor
} from '../../src/processor';
import '../helpers/loggerSpy'; // suppresses console logging
import { fhirdefs } from 'fsh-sushi';

describe('FHIRProcessor', () => {
  let processor: FHIRProcessor;
  let profileSpy: jest.SpyInstance;
  let extensionSpy: jest.SpyInstance;
  let codeSystemSpy: jest.SpyInstance;

  beforeAll(() => {
    processor = new FHIRProcessor(new fhirdefs.FHIRDefinitions());
    profileSpy = jest.spyOn(ProfileProcessor, 'process');
    extensionSpy = jest.spyOn(ExtensionProcessor, 'process');
    codeSystemSpy = jest.spyOn(CodeSystemProcessor, 'process');
  });

  beforeEach(() => {
    profileSpy.mockClear();
    extensionSpy.mockClear();
    codeSystemSpy.mockClear();
  });

  it('should try to process a Profile with the ProfileProcessor', () => {
    processor.process(path.join(__dirname, 'fixtures', 'simple-profile.json'));
    expect(profileSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process an Extension with the ExtensionProcessor', () => {
    processor.process(path.join(__dirname, 'fixtures', 'simple-extension.json'));
    expect(extensionSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process a CodeSystem with the CodeSystemProcessor', () => {
    processor.process(path.join(__dirname, 'fixtures', 'simple-codesystem.json'));
    expect(codeSystemSpy).toHaveBeenCalledTimes(1);
  });

  it('should throw an error when the input path does not refer to a file', () => {
    expect(() => {
      processor.process(path.join(__dirname, 'fixtures', 'wrong-path.json'));
    }).toThrow();
  });
  it('should throw an error when the input file is not valid JSON', () => {
    expect(() => {
      processor.process(path.join(__dirname, 'invalid-fixtures', 'invalid-profile.json'));
    }).toThrow();
  });
});
