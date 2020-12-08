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

  beforeEach(() => {
    myPackage = new Package();
    exporter = new FSHExporter(myPackage);
  });

  it('should log info messages with the number of exported entities', () => {
    myPackage.add(new ExportableProfile('FirstProfile'));
    myPackage.add(new ExportableProfile('SecondProfile'));
    myPackage.add(new ExportableCodeSystem('OnlyCodeSystem'));
    myPackage.add(new ExportableValueSet('OneOfThreeValueSets'));
    myPackage.add(new ExportableValueSet('TwoOfThreeValueSets'));
    myPackage.add(new ExportableValueSet('ThreeOfThreeValueSets'));
    exporter.export('single-file');
    expect(loggerSpy.getMessageAtIndex(-7, 'info')).toBe('Exported 2 Profiles.');
    expect(loggerSpy.getMessageAtIndex(-6, 'info')).toBe('Exported 0 Extensions.');
    expect(loggerSpy.getMessageAtIndex(-5, 'info')).toBe('Exported 1 CodeSystem.');
    expect(loggerSpy.getMessageAtIndex(-4, 'info')).toBe('Exported 3 ValueSets.');
    expect(loggerSpy.getMessageAtIndex(-3, 'info')).toBe('Exported 0 Instances.');
    expect(loggerSpy.getMessageAtIndex(-2, 'info')).toBe('Exported 0 Invariants.');
    expect(loggerSpy.getMessageAtIndex(-1, 'info')).toBe('Exported 0 Mappings.');
  });

  it('should log warning when style is unrecognized', () => {
    exporter.export('foo');
    expect(loggerSpy.getLastMessage('warn')).toMatch(/Unrecognized output style "foo"/);
  });

  it('should not export an empty file', () => {
    myPackage.add(new ExportableProfile('SomeProfile'));

    const result = exporter.export('by-category');
    // Only the profiles.fsh file should be present in the map
    expect(result).toEqual(
      new Map().set('profiles.fsh', ['Profile: SomeProfile', EOL, 'Id: SomeProfile'].join(''))
    );
  });

  describe('#groupBySingleFile', () => {
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

    afterAll(() => {
      profileSpy.mockRestore();
      extensionSpy.mockRestore();
      codeSystemSpy.mockRestore();
      valueSetSpy.mockRestore();
      invariantSpy.mockRestore();
      mappingSpy.mockRestore();
      instanceSpy.mockRestore();
      aliasSpy.mockRestore();
    });

    beforeEach(() => {
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
      exporter.export('single-file');
      expect(profileSpy).toHaveBeenCalledTimes(1);
    });

    it('should try to export an Extension', () => {
      myPackage.add(new ExportableExtension('SomeExtension'));
      exporter.export('single-file');
      expect(extensionSpy).toHaveBeenCalledTimes(1);
    });

    it('should try to export a CodeSystem', () => {
      myPackage.add(new ExportableCodeSystem('SomeCodeSystem'));
      exporter.export('single-file');
      expect(codeSystemSpy).toHaveBeenCalledTimes(1);
    });

    it('should try to export a ValueSet', () => {
      myPackage.add(new ExportableValueSet('SomeValueSet'));
      exporter.export('single-file');
      expect(valueSetSpy).toHaveBeenCalledTimes(1);
    });

    it('should try to export an Invariant', () => {
      myPackage.add(new ExportableInvariant('inv-1'));
      exporter.export('single-file');
      expect(invariantSpy).toHaveBeenCalledTimes(1);
    });

    it('should try to export a Mapping', () => {
      myPackage.add(new ExportableMapping('SomeMapping'));
      exporter.export('single-file');
      expect(mappingSpy).toHaveBeenCalledTimes(1);
    });

    it('should try to export an Instance', () => {
      myPackage.add(new ExportableInstance('SomeInstance'));
      exporter.export('single-file');
      expect(instanceSpy).toHaveBeenCalledTimes(1);
    });

    it('should try to export an Alias', () => {
      myPackage.aliases.push(new ExportableAlias('LNC', 'http://loinc.org'));
      exporter.export('single-file');
      expect(aliasSpy).toHaveBeenCalledTimes(1);
    });

    it('should export to a single resources.fsh file when style is "single-file"', () => {
      profileSpy.mockRestore();
      extensionSpy.mockRestore();
      codeSystemSpy.mockRestore();

      myPackage.add(new ExportableProfile('SomeProfile'));
      myPackage.add(new ExportableExtension('SomeExtension'));
      myPackage.add(new ExportableCodeSystem('SomeCodeSystem'));

      const result = exporter.export('single-file');
      expect(result).toEqual(
        new Map().set(
          'resources.fsh',
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
        )
      );
    });
  });

  describe('#groupByCategory', () => {
    it('should export to a multiple files grouped by category when style is "by-category"', () => {
      myPackage.add(new ExportableProfile('SomeProfile'));
      myPackage.add(new ExportableExtension('SomeExtension'));
      myPackage.add(new ExportableValueSet('SomeValueSet'));
      myPackage.add(new ExportableCodeSystem('SomeCodeSystem'));
      const instance = new ExportableInstance('SomeInstance');
      instance.instanceOf = 'SomeProfile';
      myPackage.add(instance);
      myPackage.add(new ExportableInvariant('SomeInvariant'));
      myPackage.add(new ExportableMapping('SomeMapping'));
      myPackage.aliases.push(new ExportableAlias('foo', 'http://example.com/foo'));

      const result = exporter.export('by-category');
      expect(result).toEqual(
        new Map()
          .set('aliases.fsh', ['Alias: foo = http://example.com/foo'].join(''))
          .set('profiles.fsh', ['Profile: SomeProfile', EOL, 'Id: SomeProfile'].join(''))
          .set('extensions.fsh', ['Extension: SomeExtension', EOL, 'Id: SomeExtension'].join(''))
          .set(
            'terminology.fsh',
            [
              'ValueSet: SomeValueSet',
              EOL,
              'Id: SomeValueSet',
              EOL,
              EOL,
              'CodeSystem: SomeCodeSystem',
              EOL,
              'Id: SomeCodeSystem'
            ].join('')
          )
          .set(
            'instances.fsh',
            ['Instance: SomeInstance', EOL, 'InstanceOf: SomeProfile', EOL, 'Usage: #example'].join(
              ''
            )
          )
          .set('invariants.fsh', ['Invariant: SomeInvariant'].join(''))
          .set('mappings.fsh', ['Mapping: SomeMapping', EOL, 'Id: SomeMapping'].join(''))
      );
    });

    it('should export to a multiple files grouped by category when style is undefined', () => {
      myPackage.add(new ExportableProfile('SomeProfile'));
      myPackage.add(new ExportableExtension('SomeExtension'));
      myPackage.add(new ExportableValueSet('SomeValueSet'));
      myPackage.add(new ExportableCodeSystem('SomeCodeSystem'));
      const instance = new ExportableInstance('SomeInstance');
      instance.instanceOf = 'SomeProfile';
      myPackage.add(instance);
      myPackage.add(new ExportableInvariant('SomeInvariant'));
      myPackage.add(new ExportableMapping('SomeMapping'));
      myPackage.aliases.push(new ExportableAlias('foo', 'http://example.com/foo'));

      const result = exporter.export('by-category');
      expect(result).toEqual(
        new Map()
          .set('aliases.fsh', ['Alias: foo = http://example.com/foo'].join(''))
          .set('profiles.fsh', ['Profile: SomeProfile', EOL, 'Id: SomeProfile'].join(''))
          .set('extensions.fsh', ['Extension: SomeExtension', EOL, 'Id: SomeExtension'].join(''))
          .set(
            'terminology.fsh',
            [
              'ValueSet: SomeValueSet',
              EOL,
              'Id: SomeValueSet',
              EOL,
              EOL,
              'CodeSystem: SomeCodeSystem',
              EOL,
              'Id: SomeCodeSystem'
            ].join('')
          )
          .set(
            'instances.fsh',
            ['Instance: SomeInstance', EOL, 'InstanceOf: SomeProfile', EOL, 'Usage: #example'].join(
              ''
            )
          )
          .set('invariants.fsh', ['Invariant: SomeInvariant'].join(''))
          .set('mappings.fsh', ['Mapping: SomeMapping', EOL, 'Id: SomeMapping'].join(''))
      );
    });
  });

  describe('#groupByType', () => {
    it('should export to multiple files grouped by type when style is "by-type"', () => {
      myPackage.add(new ExportableProfile('SomeProfile'));
      myPackage.add(new ExportableExtension('SomeExtension'));
      myPackage.add(new ExportableValueSet('SomeValueSet'));
      myPackage.add(new ExportableCodeSystem('SomeCodeSystem'));
      const instance = new ExportableInstance('SomeInstance');
      instance.instanceOf = 'SomeProfile';
      myPackage.add(instance);
      const definitionalInstance = new ExportableInstance('DefinitionalInstance');
      definitionalInstance.instanceOf = 'ValueSet';
      definitionalInstance.usage = 'Definition';
      myPackage.add(definitionalInstance);
      const externalExampleInstance = new ExportableInstance('ExternalExampleInstance');
      externalExampleInstance.instanceOf = 'Patient';
      myPackage.add(externalExampleInstance);
      myPackage.add(new ExportableInvariant('SomeInvariant'));
      myPackage.add(new ExportableMapping('SomeMapping'));
      myPackage.aliases.push(new ExportableAlias('foo', 'http://example.com/foo'));

      const result = exporter.export('by-type');
      expect(result).toEqual(
        new Map()
          .set('aliases.fsh', ['Alias: foo = http://example.com/foo'].join(''))
          .set(
            'SomeProfile.fsh',
            [
              'Profile: SomeProfile',
              EOL,
              'Id: SomeProfile',
              EOL,
              EOL,
              'Instance: SomeInstance',
              EOL,
              'InstanceOf: SomeProfile',
              EOL,
              'Usage: #example'
            ].join('')
          )
          .set('extensions.fsh', ['Extension: SomeExtension', EOL, 'Id: SomeExtension'].join(''))
          .set(
            'terminology.fsh',
            [
              'ValueSet: SomeValueSet',
              EOL,
              'Id: SomeValueSet',
              EOL,
              EOL,
              'CodeSystem: SomeCodeSystem',
              EOL,
              'Id: SomeCodeSystem'
            ].join('')
          )
          .set(
            'instances.fsh',
            [
              'Instance: DefinitionalInstance',
              EOL,
              'InstanceOf: ValueSet',
              EOL,
              'Usage: #definition',
              EOL,
              EOL,
              'Instance: ExternalExampleInstance',
              EOL,
              'InstanceOf: Patient',
              EOL,
              'Usage: #example'
            ].join('')
          )
          .set('invariants.fsh', ['Invariant: SomeInvariant'].join(''))
          .set('mappings.fsh', ['Mapping: SomeMapping', EOL, 'Id: SomeMapping'].join(''))
      );
    });
  });

  describe('#groupAsFilePerDefinition', () => {
    it('should export each definition to its own file when style is "file-per-definition"', () => {
      myPackage.add(new ExportableProfile('SomeProfile'));
      myPackage.add(new ExportableExtension('SomeExtension'));
      myPackage.add(new ExportableValueSet('SomeValueSet'));
      myPackage.add(new ExportableCodeSystem('SomeCodeSystem'));
      const instance = new ExportableInstance('SomeInstance');
      instance.instanceOf = 'SomeProfile';
      myPackage.add(instance);
      myPackage.add(new ExportableInvariant('SomeInvariant'));
      myPackage.add(new ExportableMapping('SomeMapping'));
      myPackage.aliases.push(new ExportableAlias('foo', 'http://example.com/foo'));

      const result = exporter.export('file-per-definition');
      expect(result).toEqual(
        new Map()
          .set('aliases.fsh', ['Alias: foo = http://example.com/foo'].join(''))
          .set('invariants.fsh', ['Invariant: SomeInvariant'].join(''))
          .set('mappings.fsh', ['Mapping: SomeMapping', EOL, 'Id: SomeMapping'].join(''))
          .set('SomeProfile-Profile.fsh', ['Profile: SomeProfile', EOL, 'Id: SomeProfile'].join(''))
          .set(
            'SomeExtension-Extension.fsh',
            ['Extension: SomeExtension', EOL, 'Id: SomeExtension'].join('')
          )
          .set(
            'SomeCodeSystem-CodeSystem.fsh',
            ['CodeSystem: SomeCodeSystem', EOL, 'Id: SomeCodeSystem'].join('')
          )
          .set(
            'SomeValueSet-ValueSet.fsh',
            ['ValueSet: SomeValueSet', EOL, 'Id: SomeValueSet'].join('')
          )
          .set(
            'SomeInstance-Instance.fsh',
            ['Instance: SomeInstance', EOL, 'InstanceOf: SomeProfile', EOL, 'Usage: #example'].join(
              ''
            )
          )
      );
    });
  });
});
