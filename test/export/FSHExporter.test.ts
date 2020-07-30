import { EOL } from 'os';
import { FSHExporter } from '../../src/export';
import { Package } from '../../src/processor';
import { ExportableProfile, ExportableExtension, ExportableCodeSystem } from '../../src/exportable';

describe('FSHExporter', () => {
  let exporter: FSHExporter;
  let myPackage: Package;
  let profileSpy: jest.SpyInstance;
  let extensionSpy: jest.SpyInstance;
  let codeSystemSpy: jest.SpyInstance;

  beforeAll(() => {
    profileSpy = jest.spyOn(ExportableProfile.prototype, 'toFSH');
    extensionSpy = jest.spyOn(ExportableExtension.prototype, 'toFSH');
    codeSystemSpy = jest.spyOn(ExportableCodeSystem.prototype, 'toFSH');
  });

  beforeEach(() => {
    myPackage = new Package();
    exporter = new FSHExporter(myPackage);
    profileSpy.mockReset();
    extensionSpy.mockReset();
    codeSystemSpy.mockReset();
  });

  it('should try to export a Profile', () => {
    myPackage.add(new ExportableProfile('SomeProfile'));
    exporter.export();
    expect(profileSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to export an Extension', () => {
    myPackage.add(new ExportableExtension('SomeExtension'));
    exporter.export();
    expect(extensionSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to export a CodeSystem with the CodeSystemExporter', () => {
    myPackage.add(new ExportableCodeSystem('SomeCodeSystem'));
    exporter.export();
    expect(codeSystemSpy).toHaveBeenCalledTimes(1);
  });

  it('should separate each exported result with one blank line', () => {
    profileSpy.mockRestore();
    extensionSpy.mockRestore();
    codeSystemSpy.mockRestore();

    myPackage.add(new ExportableProfile('SomeProfile'));
    myPackage.add(new ExportableExtension('SomeExtension'));
    myPackage.add(new ExportableCodeSystem('SomeCodeSystem'));

    const result = exporter.export();
    expect(result).toBe(
      [
        'Profile: SomeProfile',
        EOL,
        'Id: SomeProfile',
        EOL,
        EOL,
        'Extension: SomeExtension',
        EOL,
        'Id: SomeExtension',
        EOL,
        EOL,
        'CodeSystem: SomeCodeSystem',
        EOL,
        'Id: SomeCodeSystem'
      ].join('')
    );
  });
});
