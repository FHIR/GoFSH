import { EOL } from 'os';
import { FSHExporter } from '../../src/export';
import { Package } from '../../src/processor';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableCodeSystem,
  ExportableInvariant
} from '../../src/exportable';
import { loggerSpy } from '../helpers/loggerSpy';

describe('FSHExporter', () => {
  let exporter: FSHExporter;
  let myPackage: Package;
  let profileSpy: jest.SpyInstance;
  let extensionSpy: jest.SpyInstance;
  let codeSystemSpy: jest.SpyInstance;
  let invariantSpy: jest.SpyInstance;

  beforeAll(() => {
    profileSpy = jest.spyOn(ExportableProfile.prototype, 'toFSH');
    extensionSpy = jest.spyOn(ExportableExtension.prototype, 'toFSH');
    codeSystemSpy = jest.spyOn(ExportableCodeSystem.prototype, 'toFSH');
    invariantSpy = jest.spyOn(ExportableInvariant.prototype, 'toFSH');
  });

  beforeEach(() => {
    myPackage = new Package();
    exporter = new FSHExporter(myPackage);
    profileSpy.mockReset();
    extensionSpy.mockReset();
    codeSystemSpy.mockReset();
    invariantSpy.mockReset();
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

  it('should try to export a CodeSystem', () => {
    myPackage.add(new ExportableCodeSystem('SomeCodeSystem'));
    exporter.export();
    expect(codeSystemSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to export an Invariant', () => {
    myPackage.add(new ExportableInvariant('inv-1'));
    exporter.export();
    expect(invariantSpy).toHaveBeenCalledTimes(1);
  });

  it('should log info messages with the number of exported entities', () => {
    myPackage.add(new ExportableProfile('FirstProfile'));
    myPackage.add(new ExportableProfile('SecondProfile'));
    myPackage.add(new ExportableCodeSystem('OnlyCodeSystem'));
    exporter.export();
    expect(loggerSpy.getMessageAtIndex(-4, 'info')).toBe('Exported 2 Profiles.');
    expect(loggerSpy.getMessageAtIndex(-3, 'info')).toBe('Exported 0 Extensions.');
    expect(loggerSpy.getMessageAtIndex(-2, 'info')).toBe('Exported 1 CodeSystem.');
    expect(loggerSpy.getMessageAtIndex(-1, 'info')).toBe('Exported 0 Invariants.');
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
