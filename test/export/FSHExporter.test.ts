import { EOL } from 'os';
import { FSHExporter } from '../../src/export';
import { Package } from '../../src/processor';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableCodeSystem,
  ExportableValueSet,
  ExportableInvariant,
  ExportableMapping,
  ExportableInstance,
  ExportableAlias
} from '../../src/exportable';
import { loggerSpy } from '../helpers/loggerSpy';

describe('FSHExporter', () => {
  let exporter: FSHExporter;
  let myPackage: Package;
  let profileSpy: jest.SpyInstance;
  let extensionSpy: jest.SpyInstance;
  let codeSystemSpy: jest.SpyInstance;
  let valueSetSpy: jest.SpyInstance;
  let invariantSpy: jest.SpyInstance;
  let mappingSpy: jest.SpyInstance;
  let instanceSpy: jest.SpyInstance;
  let aliasSpy: jest.SpyInstance;

  beforeAll(() => {
    profileSpy = jest.spyOn(ExportableProfile.prototype, 'toFSH');
    extensionSpy = jest.spyOn(ExportableExtension.prototype, 'toFSH');
    codeSystemSpy = jest.spyOn(ExportableCodeSystem.prototype, 'toFSH');
    valueSetSpy = jest.spyOn(ExportableValueSet.prototype, 'toFSH');
    invariantSpy = jest.spyOn(ExportableInvariant.prototype, 'toFSH');
    mappingSpy = jest.spyOn(ExportableMapping.prototype, 'toFSH');
    instanceSpy = jest.spyOn(ExportableInstance.prototype, 'toFSH');
    aliasSpy = jest.spyOn(ExportableAlias.prototype, 'toFSH');
  });

  beforeEach(() => {
    myPackage = new Package();
    exporter = new FSHExporter(myPackage);
    profileSpy.mockReset();
    extensionSpy.mockReset();
    codeSystemSpy.mockReset();
    valueSetSpy.mockReset();
    invariantSpy.mockReset();
    mappingSpy.mockReset();
    instanceSpy.mockReset();
    aliasSpy.mockReset();
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

  it('should try to export a ValueSet', () => {
    myPackage.add(new ExportableValueSet('SomeValueSet'));
    exporter.export();
    expect(valueSetSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to export an Invariant', () => {
    myPackage.add(new ExportableInvariant('inv-1'));
    exporter.export();
    expect(invariantSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to export a Mapping', () => {
    myPackage.add(new ExportableMapping('SomeMapping'));
    exporter.export();
    expect(mappingSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to export an Instance', () => {
    myPackage.add(new ExportableInstance('SomeInstance'));
    exporter.export();
    expect(instanceSpy).toHaveBeenCalledTimes(1);
  });

  it('should try to export an Alias', () => {
    myPackage.aliases.push(new ExportableAlias('LNC', 'http://loinc.org'));
    exporter.export();
    expect(aliasSpy).toHaveBeenCalledTimes(1);
  });

  it('should log info messages with the number of exported entities', () => {
    myPackage.add(new ExportableProfile('FirstProfile'));
    myPackage.add(new ExportableProfile('SecondProfile'));
    myPackage.add(new ExportableCodeSystem('OnlyCodeSystem'));
    myPackage.add(new ExportableValueSet('OneOfThreeValueSets'));
    myPackage.add(new ExportableValueSet('TwoOfThreeValueSets'));
    myPackage.add(new ExportableValueSet('ThreeOfThreeValueSets'));
    exporter.export();
    expect(loggerSpy.getMessageAtIndex(-7, 'info')).toBe('Exported 2 Profiles.');
    expect(loggerSpy.getMessageAtIndex(-6, 'info')).toBe('Exported 0 Extensions.');
    expect(loggerSpy.getMessageAtIndex(-5, 'info')).toBe('Exported 1 CodeSystem.');
    expect(loggerSpy.getMessageAtIndex(-4, 'info')).toBe('Exported 3 ValueSets.');
    expect(loggerSpy.getMessageAtIndex(-3, 'info')).toBe('Exported 0 Instances.');
    expect(loggerSpy.getMessageAtIndex(-2, 'info')).toBe('Exported 0 Invariants.');
    expect(loggerSpy.getMessageAtIndex(-1, 'info')).toBe('Exported 0 Mappings.');
  });

  it('should separate each exported result with one blank line', () => {
    profileSpy.mockRestore();
    extensionSpy.mockRestore();
    codeSystemSpy.mockRestore();
    aliasSpy.mockRestore();

    myPackage.aliases.push(new ExportableAlias('LNC', 'http://loinc.org'));
    myPackage.add(new ExportableProfile('SomeProfile'));
    myPackage.add(new ExportableExtension('SomeExtension'));
    myPackage.add(new ExportableCodeSystem('SomeCodeSystem'));

    const result = exporter.export();
    expect(result).toBe(
      [
        'Alias: LNC = http://loinc.org',
        EOL,
        EOL,
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
