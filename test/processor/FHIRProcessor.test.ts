import path from 'path';
import { ProfileProcessor, ExtensionProcessor, FHIRProcessor } from '../../src/processor';

describe('FHIRProcessor', () => {
  let processor: FHIRProcessor;
  let profileSpy: jest.SpyInstance;
  let extensionSpy: jest.SpyInstance;

  beforeAll(() => {
    processor = new FHIRProcessor();
    profileSpy = jest.spyOn(ProfileProcessor.prototype, 'process');
    extensionSpy = jest.spyOn(ExtensionProcessor.prototype, 'process');
  });

  beforeEach(() => {
    profileSpy.mockClear();
    extensionSpy.mockClear();
  });

  it('should try to process a Profile with the ProfileProcess', () => {
    processor.process(path.join(__dirname, 'fixtures', 'simple-profile.json'));
    expect(profileSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to process an Extension with the ExtensionProcessor', () => {
    processor.process(path.join(__dirname, 'fixtures', 'simple-extension.json'));
    expect(extensionSpy).toHaveBeenCalledTimes(1);
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
