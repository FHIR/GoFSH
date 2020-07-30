import { EOL } from 'os';
import {
  FSHExporter,
  ProfileExporter,
  ExtensionExporter,
  CodeSystemExporter
} from '../../src/export';
import { Package } from '../../src/processor';
import { Profile, Extension, FshCodeSystem } from 'fsh-sushi/dist/fshtypes';

describe('FSHExporter', () => {
  let exporter: FSHExporter;
  let myPackage: Package;
  let profileSpy: jest.SpyInstance;
  let extensionSpy: jest.SpyInstance;
  let codeSystemSpy: jest.SpyInstance;

  beforeAll(() => {
    profileSpy = jest.spyOn(ProfileExporter.prototype, 'export');
    extensionSpy = jest.spyOn(ExtensionExporter.prototype, 'export');
    codeSystemSpy = jest.spyOn(CodeSystemExporter.prototype, 'export');
  });

  beforeEach(() => {
    myPackage = new Package();
    exporter = new FSHExporter(myPackage);
    profileSpy.mockReset();
    extensionSpy.mockReset();
    codeSystemSpy.mockReset();
  });

  it('should try to export a Profile with the ProfileExporter', () => {
    myPackage.add(new Profile('SomeProfile'));
    exporter.export();
    expect(profileSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to export an Extension with the ExtensionExporter', () => {
    myPackage.add(new Extension('SomeExtension'));
    exporter.export();
    expect(extensionSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to export a CodeSystem with the CodeSystemExporter', () => {
    myPackage.add(new FshCodeSystem('SomeCodeSystem'));
    exporter.export();
    expect(codeSystemSpy).toHaveBeenCalledTimes(1);
  });

  it('should separate each exported result with one blank line', () => {
    profileSpy.mockImplementation((profile: Profile) => profile.name);
    extensionSpy.mockImplementation((extension: Extension) => extension.name);
    myPackage.add(new Profile('FirstProfile'));
    myPackage.add(new Extension('FirstExtension'));
    myPackage.add(new Profile('SecondProfile'));

    const result = exporter.export();
    expect(result).toBe(['FirstProfile', 'SecondProfile', 'FirstExtension'].join(`${EOL}${EOL}`));
  });
});
