import fs from 'fs-extra';
import path from 'path';
import * as processing from '../../src/utils/Processing';
import { fshtypes } from 'fsh-sushi';
import { logger } from '../../src/utils';
import { fhirToFsh, ResourceMap } from '../../src/api';
import { loggerSpy } from '../helpers/loggerSpy';
import { EOL } from 'os';
describe('fhirToFsh', () => {
  let loadSpy: jest.SpyInstance;
  let defaultConfig: fshtypes.Configuration;

  beforeAll(() => {
    const sd = JSON.parse(
      fs.readFileSync(
        path.join(
          __dirname,
          '..',
          'helpers',
          'testdefs',
          'StructureDefinition-StructureDefinition.json'
        ),
        'utf-8'
      )
    );
    const patient = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '..', 'helpers', 'testdefs', 'StructureDefinition-Patient.json'),
        'utf-8'
      )
    );
    loadSpy = jest.spyOn(processing, 'loadExternalDependencies').mockImplementation(defs => {
      defs.add(sd);
      defs.add(patient);
      return [undefined];
    });
    defaultConfig = {
      FSHOnly: true,
      canonical: 'http://example.org',
      fhirVersion: ['4.0.1'],
      id: 'example',
      name: 'Example',
      applyExtensionMetadataToRoot: false
    };
  });

  beforeEach(() => {
    loadSpy.mockClear();
    loggerSpy.reset();
  });

  it('should use the "info" logging level by default', async () => {
    await expect(fhirToFsh([])).resolves.toEqual({
      errors: [],
      warnings: [],
      fsh: '',
      configuration: defaultConfig
    });
    expect(logger.level).toBe('info');
  });

  it('should use a higher logging level when specified', async () => {
    const results = await fhirToFsh(['not json'], { logLevel: 'error' });
    expect(results.errors).toHaveLength(1);
    expect(results.errors[0].message).toMatch(/Could not parse Input_0/);
    expect(results.warnings).toHaveLength(0);
    expect(results.fsh).toEqual('');
    expect(results.configuration).toEqual(defaultConfig);
    expect(logger.level).toBe('error');
  });

  it('should mute the logger when "silent" is specified', async () => {
    const results = await fhirToFsh(['not json'], { logLevel: 'silent' });
    expect(results.errors).toHaveLength(1);
    // errors are still tracked, even when the logger is silent
    expect(results.errors[0].message).toMatch(/Could not parse Input_0/);
    expect(results.warnings).toHaveLength(0);
    expect(results.fsh).toEqual('');
    expect(results.configuration).toEqual(defaultConfig);
    expect(logger.transports[0].silent).toBe(true);
  });

  it('should quit and return an error when an invalid logLevel is specified', async () => {
    // @ts-ignore
    const results = await fhirToFsh(['not json'], { logLevel: '11' });
    expect(results.errors).toHaveLength(1);
    expect(results.errors[0].message).toMatch(
      /Invalid logLevel: 11. Valid levels include: silly, debug, verbose, http, info, warn, error, silent/
    );
    expect(results.warnings).toHaveLength(0);
    expect(results.fsh).toBeNull();
    expect(results.configuration).toBeNull();
  });

  it('should ignore non-FHIR JSON ', async () => {
    const results = await fhirToFsh([{ notResourceType: 'notStructureDefinition' }]);
    expect(results.errors).toHaveLength(0);
    expect(results.warnings).toHaveLength(0);
    expect(results.fsh).toEqual('');
    expect(results.configuration).toEqual(defaultConfig);
  });

  it('should load dependencies from user input', async () => {
    // Should be able to accept both # and @ style for dependencies
    const results = await fhirToFsh([], {
      dependencies: ['hl7.fhir.us.core#3.1.0', 'hl7.fhir.us.mcode@1.0.0']
    });
    expect(results.errors).toHaveLength(0);
    expect(results.warnings).toHaveLength(0);
    expect(results.fsh).toEqual('');
    expect(results.configuration).toEqual({
      ...defaultConfig,
      dependencies: [
        { packageId: 'hl7.fhir.us.core', version: '3.1.0' },
        { packageId: 'hl7.fhir.us.mcode', version: '1.0.0' }
      ]
    });

    expect(loadSpy.mock.calls).toHaveLength(1);
    expect(loadSpy.mock.calls[0][1]).toEqual(['hl7.fhir.us.core@3.1.0', 'hl7.fhir.us.mcode@1.0.0']);
  });

  it('should parse a string input into JSON', async () => {
    const results = await fhirToFsh([
      JSON.stringify({
        resourceType: 'StructureDefinition',
        name: 'Foo',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Patient'
      })
    ]);
    expect(results.errors).toHaveLength(0);
    expect(results.warnings).toHaveLength(0);
    expect(results.fsh).toEqual(['Profile: Foo', 'Parent: Patient', 'Id: Foo'].join(EOL));
    expect(results.configuration).toEqual(defaultConfig);
  });

  it('should export FHIR JSON using the "string" style by default', async () => {
    const results = await fhirToFsh([
      {
        resourceType: 'StructureDefinition',
        name: 'Foo',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Patient'
      }
    ]);
    expect(results.errors).toHaveLength(0);
    expect(results.warnings).toHaveLength(0);
    expect(results.fsh).toEqual(['Profile: Foo', 'Parent: Patient', 'Id: Foo'].join(EOL));
    expect(results.configuration).toEqual(defaultConfig);
  });

  it('should export FHIR JSON using the "string" style when an unexpected style is given', async () => {
    const results = await fhirToFsh([
      {
        resourceType: 'StructureDefinition',
        name: 'Foo',
        baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Patient'
      },
      { style: 'boo' }
    ]);
    expect(results.errors).toHaveLength(0);
    expect(results.warnings).toHaveLength(0);
    expect(results.fsh).toEqual(['Profile: Foo', 'Parent: Patient', 'Id: Foo'].join(EOL));
    expect(results.configuration).toEqual(defaultConfig);
  });

  it('should export FHIR JSON using the "string" style explicitly ', async () => {
    const results = await fhirToFsh(
      [
        {
          resourceType: 'StructureDefinition',
          name: 'Foo',
          baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Patient'
        }
      ],
      { style: 'string' }
    );
    expect(results.errors).toHaveLength(0);
    expect(results.warnings).toHaveLength(0);
    expect(results.fsh).toEqual(['Profile: Foo', 'Parent: Patient', 'Id: Foo'].join(EOL));
    expect(results.configuration).toEqual(defaultConfig);
  });

  it('should export FHIR JSON using the "map" style ', async () => {
    const results = await fhirToFsh(
      [
        {
          resourceType: 'StructureDefinition',
          name: 'Foo',
          baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Patient'
        }
      ],
      { style: 'map' }
    );
    expect(results.errors).toHaveLength(0);
    expect(results.warnings).toHaveLength(0);
    const expectedProfileMap = new ResourceMap();
    expectedProfileMap.set('Foo', ['Profile: Foo', 'Parent: Patient', 'Id: Foo'].join(EOL));
    expect(results.fsh).toEqual({
      profiles: expectedProfileMap,
      aliases: '',
      invariants: new ResourceMap(),
      mappings: new ResourceMap(),
      extensions: new ResourceMap(),
      codeSystems: new ResourceMap(),
      valueSets: new ResourceMap(),
      instances: new ResourceMap()
    });
    expect(results.configuration).toEqual(defaultConfig);
  });
});
