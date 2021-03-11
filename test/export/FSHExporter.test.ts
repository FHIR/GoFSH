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
  ExportableAlias,
  ExportableAssignmentRule,
  ExportableObeysRule,
  ExportableCaretValueRule
} from '../../src/exportable';
import { loggerSpy } from '../helpers/loggerSpy';
import table from 'text-table';
import { ResourceMap } from '../../src/api';

describe('FSHExporter', () => {
  let exporter: FSHExporter;
  let myPackage: Package;

  beforeEach(() => {
    myPackage = new Package();
    exporter = new FSHExporter(myPackage);
  });

  it('should create index.txt', () => {
    myPackage.add(new ExportableProfile('FirstProfile'));
    myPackage.add(new ExportableProfile('SecondProfile'));
    myPackage.add(new ExportableCodeSystem('OnlyCodeSystem'));
    myPackage.add(new ExportableValueSet('OneOfThreeValueSets'));
    myPackage.add(new ExportableValueSet('TwoOfThreeValueSets'));
    myPackage.add(new ExportableValueSet('ThreeOfThreeValueSets'));
    const output = exporter.export('single-file');

    expect(output.get('index.txt')).toEqual(
      table([
        ['Name', 'Type', 'File'],
        ['FirstProfile', 'Profile', 'resources.fsh'],
        ['OneOfThreeValueSets', 'ValueSet', 'resources.fsh'],
        ['OnlyCodeSystem', 'CodeSystem', 'resources.fsh'],
        ['SecondProfile', 'Profile', 'resources.fsh'],
        ['ThreeOfThreeValueSets', 'ValueSet', 'resources.fsh'],
        ['TwoOfThreeValueSets', 'ValueSet', 'resources.fsh']
      ])
    );
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
      new Map().set('profiles.fsh', ['Profile: SomeProfile', EOL, 'Id: SomeProfile'].join('')).set(
        'index.txt',
        table([
          ['Name', 'Type', 'File'],
          ['SomeProfile', 'Profile', 'profiles.fsh']
        ])
      )
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
        new Map()
          .set(
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
          .set(
            'index.txt',
            table([
              ['Name', 'Type', 'File'],
              ['SomeCodeSystem', 'CodeSystem', 'resources.fsh'],
              ['SomeExtension', 'Extension', 'resources.fsh'],
              ['SomeProfile', 'Profile', 'resources.fsh']
            ])
          )
      );
    });
  });

  describe('#groupByFSHType', () => {
    it('should export to a multiple files grouped by category when style is "group-by-fsh-type"', () => {
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

      const result = exporter.export('group-by-fsh-type');
      expect(result).toEqual(
        new Map()
          .set('aliases.fsh', ['Alias: foo = http://example.com/foo'].join(''))
          .set('profiles.fsh', ['Profile: SomeProfile', EOL, 'Id: SomeProfile'].join(''))
          .set('extensions.fsh', ['Extension: SomeExtension', EOL, 'Id: SomeExtension'].join(''))
          .set('valueSets.fsh', ['ValueSet: SomeValueSet', EOL, 'Id: SomeValueSet'].join(''))
          .set(
            'codeSystems.fsh',
            ['CodeSystem: SomeCodeSystem', EOL, 'Id: SomeCodeSystem'].join('')
          )
          .set(
            'instances.fsh',
            ['Instance: SomeInstance', EOL, 'InstanceOf: SomeProfile', EOL, 'Usage: #example'].join(
              ''
            )
          )
          .set('invariants.fsh', ['Invariant: SomeInvariant'].join(''))
          .set('mappings.fsh', ['Mapping: SomeMapping', EOL, 'Id: SomeMapping'].join(''))
          .set(
            'index.txt',
            table([
              ['Name', 'Type', 'File'],
              ['SomeCodeSystem', 'CodeSystem', 'codeSystems.fsh'],
              ['SomeExtension', 'Extension', 'extensions.fsh'],
              ['SomeInstance', 'Instance', 'instances.fsh'],
              ['SomeInvariant', 'Invariant', 'invariants.fsh'],
              ['SomeMapping', 'Mapping', 'mappings.fsh'],
              ['SomeProfile', 'Profile', 'profiles.fsh'],
              ['SomeValueSet', 'ValueSet', 'valueSets.fsh']
            ])
          )
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
          .set('valueSets.fsh', ['ValueSet: SomeValueSet', EOL, 'Id: SomeValueSet'].join(''))
          .set(
            'codeSystems.fsh',
            ['CodeSystem: SomeCodeSystem', EOL, 'Id: SomeCodeSystem'].join('')
          )
          .set(
            'instances.fsh',
            ['Instance: SomeInstance', EOL, 'InstanceOf: SomeProfile', EOL, 'Usage: #example'].join(
              ''
            )
          )
          .set('invariants.fsh', ['Invariant: SomeInvariant'].join(''))
          .set('mappings.fsh', ['Mapping: SomeMapping', EOL, 'Id: SomeMapping'].join(''))
          .set(
            'index.txt',
            table([
              ['Name', 'Type', 'File'],
              ['SomeCodeSystem', 'CodeSystem', 'codeSystems.fsh'],
              ['SomeExtension', 'Extension', 'extensions.fsh'],
              ['SomeInstance', 'Instance', 'instances.fsh'],
              ['SomeInvariant', 'Invariant', 'invariants.fsh'],
              ['SomeMapping', 'Mapping', 'mappings.fsh'],
              ['SomeProfile', 'Profile', 'profiles.fsh'],
              ['SomeValueSet', 'ValueSet', 'valueSets.fsh']
            ])
          )
      );
    });
  });

  describe('#groupByProfile', () => {
    it('should export to multiple files grouped by type when style is "group-by-profile"', () => {
      const profile1 = new ExportableProfile('SomeProfile');
      myPackage.add(profile1);
      const profile2 = new ExportableProfile('AnotherProfile');
      myPackage.add(profile2);
      myPackage.add(new ExportableExtension('SomeExtension'));
      myPackage.add(new ExportableValueSet('SomeValueSet'));
      myPackage.add(new ExportableCodeSystem('SomeCodeSystem'));

      const instance = new ExportableInstance('SomeInstance');
      instance.instanceOf = 'SomeProfile';
      myPackage.add(instance);

      const anotherInstance = new ExportableInstance('AnotherInstance');
      anotherInstance.instanceOf = 'AnotherProfile';
      myPackage.add(anotherInstance);

      // Add one inline instance which is only used once
      const inlineInstance1 = new ExportableInstance('SomeInlineInstance');
      inlineInstance1.instanceOf = 'Patient';
      inlineInstance1.usage = 'Inline';
      myPackage.add(inlineInstance1);
      const inlineInstance1Rule = new ExportableAssignmentRule('contained[0]');
      inlineInstance1Rule.isInstance = true;
      inlineInstance1Rule.value = 'SomeInlineInstance';
      instance.rules.push(inlineInstance1Rule);

      // And another which is used in several places
      const inlineInstance2 = new ExportableInstance('AnotherInlineInstance');
      inlineInstance2.instanceOf = 'Patient';
      inlineInstance2.usage = 'Inline';
      myPackage.add(inlineInstance2);
      const inlineInstance2Rule = new ExportableAssignmentRule('contained[1]');
      inlineInstance2Rule.isInstance = true;
      inlineInstance2Rule.value = 'AnotherInlineInstance';
      instance.rules.push(inlineInstance2Rule);
      anotherInstance.rules.push(inlineInstance2Rule);

      // Add an inline instance used on a profile
      const inlineInstance3 = new ExportableInstance('YetAnotherInlineInstance');
      inlineInstance3.instanceOf = 'Patient';
      inlineInstance3.usage = 'Inline';
      myPackage.add(inlineInstance3);
      const inlineInstance3Rule = new ExportableCaretValueRule('');
      inlineInstance3Rule.caretPath = 'contained[0]';
      inlineInstance3Rule.isInstance = true;
      inlineInstance3Rule.value = 'YetAnotherInlineInstance';
      profile1.rules.push(inlineInstance3Rule);

      const definitionalInstance = new ExportableInstance('DefinitionalInstance');
      definitionalInstance.instanceOf = 'ValueSet';
      definitionalInstance.usage = 'Definition';
      myPackage.add(definitionalInstance);

      const externalExampleInstance = new ExportableInstance('ExternalExampleInstance');
      externalExampleInstance.instanceOf = 'Patient';
      myPackage.add(externalExampleInstance);

      // Add one invariant that is used in one place
      const invariant1 = new ExportableInvariant('SomeInvariant');
      myPackage.add(invariant1);
      const obeysRule1 = new ExportableObeysRule('foo');
      obeysRule1.keys = [invariant1.name];
      profile1.rules.push(obeysRule1);

      // And another that is used in several places
      const invariant2 = new ExportableInvariant('AnotherInvariant');
      myPackage.add(invariant2);
      const obeysRule2 = new ExportableObeysRule('foo');
      obeysRule2.keys = [invariant2.name];
      profile1.rules.push(obeysRule2);
      profile2.rules.push(obeysRule2);

      myPackage.add(new ExportableMapping('SomeMapping'));
      myPackage.aliases.push(new ExportableAlias('foo', 'http://example.com/foo'));

      const result = exporter.export('group-by-profile');
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
              '* ^contained[0] = YetAnotherInlineInstance',
              EOL,
              '* foo obeys SomeInvariant',
              EOL,
              '* foo obeys AnotherInvariant',
              EOL,
              EOL,
              'Instance: SomeInstance',
              EOL,
              'InstanceOf: SomeProfile',
              EOL,
              'Usage: #example',
              EOL,
              '* contained[0] = SomeInlineInstance',
              EOL,
              '* contained[1] = AnotherInlineInstance',
              EOL,
              EOL,
              'Instance: SomeInlineInstance',
              EOL,
              'InstanceOf: Patient',
              EOL,
              'Usage: #inline',
              EOL,
              EOL,
              'Instance: YetAnotherInlineInstance',
              EOL,
              'InstanceOf: Patient',
              EOL,
              'Usage: #inline',
              EOL,
              EOL,
              'Invariant: SomeInvariant'
            ].join('')
          )
          .set(
            'AnotherProfile.fsh',
            [
              'Profile: AnotherProfile',
              EOL,
              'Id: AnotherProfile',
              EOL,
              '* foo obeys AnotherInvariant',
              EOL,
              EOL,
              'Instance: AnotherInstance',
              EOL,
              'InstanceOf: AnotherProfile',
              EOL,
              'Usage: #example',
              EOL,
              '* contained[1] = AnotherInlineInstance'
            ].join('')
          )
          .set('extensions.fsh', ['Extension: SomeExtension', EOL, 'Id: SomeExtension'].join(''))
          .set('valueSets.fsh', ['ValueSet: SomeValueSet', EOL, 'Id: SomeValueSet'].join(''))
          .set(
            'codeSystems.fsh',
            ['CodeSystem: SomeCodeSystem', EOL, 'Id: SomeCodeSystem'].join('')
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
              'Usage: #example',
              EOL,
              EOL,
              'Instance: AnotherInlineInstance',
              EOL,
              'InstanceOf: Patient',
              EOL,
              'Usage: #inline'
            ].join('')
          )
          .set('invariants.fsh', ['Invariant: AnotherInvariant'].join(''))
          .set('mappings.fsh', ['Mapping: SomeMapping', EOL, 'Id: SomeMapping'].join(''))
          .set(
            'index.txt',
            table([
              ['Name', 'Type', 'File'],
              ['AnotherInlineInstance', 'Instance', 'instances.fsh'],
              ['AnotherInstance', 'Instance', 'AnotherProfile.fsh'],
              ['AnotherInvariant', 'Invariant', 'invariants.fsh'],
              ['AnotherProfile', 'Profile', 'AnotherProfile.fsh'],
              ['DefinitionalInstance', 'Instance', 'instances.fsh'],
              ['ExternalExampleInstance', 'Instance', 'instances.fsh'],
              ['SomeCodeSystem', 'CodeSystem', 'codeSystems.fsh'],
              ['SomeExtension', 'Extension', 'extensions.fsh'],
              ['SomeInlineInstance', 'Instance', 'SomeProfile.fsh'],
              ['SomeInstance', 'Instance', 'SomeProfile.fsh'],
              ['SomeInvariant', 'Invariant', 'SomeProfile.fsh'],
              ['SomeMapping', 'Mapping', 'mappings.fsh'],
              ['SomeProfile', 'Profile', 'SomeProfile.fsh'],
              ['SomeValueSet', 'ValueSet', 'valueSets.fsh'],
              ['YetAnotherInlineInstance', 'Instance', 'SomeProfile.fsh']
            ])
          )
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
          .set('SomeInvariant-Invariant.fsh', ['Invariant: SomeInvariant'].join(''))
          .set('SomeMapping-Mapping.fsh', ['Mapping: SomeMapping', EOL, 'Id: SomeMapping'].join(''))
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
          .set(
            'index.txt',
            table([
              ['Name', 'Type', 'File'],
              ['SomeCodeSystem', 'CodeSystem', 'SomeCodeSystem-CodeSystem.fsh'],
              ['SomeExtension', 'Extension', 'SomeExtension-Extension.fsh'],
              ['SomeInstance', 'Instance', 'SomeInstance-Instance.fsh'],
              ['SomeInvariant', 'Invariant', 'SomeInvariant-Invariant.fsh'],
              ['SomeMapping', 'Mapping', 'SomeMapping-Mapping.fsh'],
              ['SomeProfile', 'Profile', 'SomeProfile-Profile.fsh'],
              ['SomeValueSet', 'ValueSet', 'SomeValueSet-ValueSet.fsh']
            ])
          )
      );
    });
  });

  describe('#apiExport', () => {
    it('should export to a string when style is "string"', () => {
      myPackage.aliases.push(new ExportableAlias('SomeAlias', 'http://test.com'));
      myPackage.add(new ExportableProfile('SomeProfile'));
      myPackage.add(new ExportableExtension('SomeExtension'));
      myPackage.add(new ExportableCodeSystem('SomeCodeSystem'));
      myPackage.add(new ExportableValueSet('SomeValueSet'));
      const instance = new ExportableInstance('SomeInstance');
      instance.instanceOf = 'SomeProfile';
      myPackage.add(instance);
      myPackage.add(new ExportableInvariant('SomeInvariant'));
      myPackage.add(new ExportableMapping('SomeMapping'));

      expect(exporter.apiExport('string')).toEqual(
        [
          'Alias: SomeAlias = http://test.com',
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
          'Id: SomeCodeSystem',
          EOL,
          EOL,
          'ValueSet: SomeValueSet',
          EOL,
          'Id: SomeValueSet',
          EOL,
          EOL,
          'Instance: SomeInstance',
          EOL,
          'InstanceOf: SomeProfile',
          EOL,
          'Usage: #example',
          EOL,
          EOL,
          'Invariant: SomeInvariant',
          EOL,
          EOL,
          'Mapping: SomeMapping',
          EOL,
          'Id: SomeMapping'
        ].join('')
      );
    });

    it('should export to a map when style is "map"', () => {
      myPackage.aliases.push(new ExportableAlias('SomeAlias', 'http://test.com'));
      myPackage.add(new ExportableProfile('SomeProfile'));
      myPackage.add(new ExportableExtension('SomeExtension'));
      myPackage.add(new ExportableCodeSystem('SomeCodeSystem'));
      myPackage.add(new ExportableValueSet('SomeValueSet'));
      const instance = new ExportableInstance('SomeInstance');
      instance.instanceOf = 'SomeProfile';
      myPackage.add(instance);
      myPackage.add(new ExportableInvariant('SomeInvariant'));
      myPackage.add(new ExportableMapping('SomeMapping'));

      expect(exporter.apiExport('map')).toEqual({
        aliases: ['Alias: SomeAlias = http://test.com'].join(''),
        invariants: new ResourceMap().set('SomeInvariant', ['Invariant: SomeInvariant'].join('')),
        mappings: new ResourceMap().set(
          'SomeMapping',
          ['Mapping: SomeMapping', EOL, 'Id: SomeMapping'].join('')
        ),
        profiles: new ResourceMap().set(
          'SomeProfile',
          ['Profile: SomeProfile', EOL, 'Id: SomeProfile'].join('')
        ),
        extensions: new ResourceMap().set(
          'SomeExtension',
          ['Extension: SomeExtension', EOL, 'Id: SomeExtension'].join('')
        ),
        codeSystems: new ResourceMap().set(
          'SomeCodeSystem',
          ['CodeSystem: SomeCodeSystem', EOL, 'Id: SomeCodeSystem'].join('')
        ),
        valueSets: new ResourceMap().set(
          'SomeValueSet',
          ['ValueSet: SomeValueSet', EOL, 'Id: SomeValueSet'].join('')
        ),
        instances: new ResourceMap().set(
          'SomeInstance',
          ['Instance: SomeInstance', EOL, 'InstanceOf: SomeProfile', EOL, 'Usage: #example'].join(
            ''
          )
        )
      });
    });

    it('should export to a map than can be serialized by JSON.stringify()', () => {
      myPackage.add(new ExportableProfile('TestProfile'));
      const instance = new ExportableInstance('TestInstance');
      instance.instanceOf = 'TestProfile';
      myPackage.add(instance);

      const serializedString =
        '{"aliases":"","invariants":{},"mappings":{},"profiles":{"TestProfile":"Profile: TestProfile\\nId: TestProfile"},"extensions":{},"codeSystems":{},"valueSets":{},"instances":{"TestInstance":"Instance: TestInstance\\nInstanceOf: TestProfile\\nUsage: #example"}}';
      const exportedMap = exporter.apiExport('map');

      expect(JSON.stringify(exportedMap)).toEqual(serializedString);
    });
  });
});
