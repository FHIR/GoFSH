import path from 'path';
import fs from 'fs-extra';
import { fhirdefs, fshtypes } from 'fsh-sushi';
import { InstanceProcessor } from '../../src/processor';
import { ExportableAssignmentRule, ExportableInstance } from '../../src/exportable';
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';
import { loggerSpy } from '../helpers/loggerSpy';

describe('InstanceProcessor', () => {
  let simpleIg: any;
  let defs: fhirdefs.FHIRDefinitions;

  beforeEach(() => {
    simpleIg = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-ig.json'), 'utf-8')
    );
    defs = loadTestDefinitions();
    loggerSpy.reset();
  });

  it('should convert the simplest example Instance', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-patient.json'), 'utf-8')
    );
    const result = InstanceProcessor.process(input, simpleIg, defs);
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('simple-patient');
    expect(result.instanceOf).toBe('Patient');
    expect(result.usage).toBe('Example');
  });

  it('should convert an example Instance with a meta.profile', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'profiled-patient.json'), 'utf-8')
    );
    const result = InstanceProcessor.process(input, simpleIg, defs);
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('profiled-patient');
    expect(result.instanceOf).toBe('http://example.org/StructureDefinition/profiled-patient');
    expect(result.usage).toBe('Example');
  });

  it('should convert the simplest vocabulary Instance', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-valueset-with-id.json'), 'utf-8')
    );
    const result = InstanceProcessor.process(input, simpleIg, defs);
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('my.value-set');
    expect(result.instanceOf).toBe('ValueSet');
    expect(result.usage).toBe('Definition');
  });

  it('should convert an example Instance with additional metadata from an IG', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-valueset-with-id.json'), 'utf-8')
    );
    simpleIg.definition = {
      resource: [
        {
          reference: { reference: 'ValueSet/my.value-set' },
          name: 'My Title',
          description: 'My Description',
          exampleBoolean: true
        }
      ]
    };
    const result = InstanceProcessor.process(input, simpleIg, defs);
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('my.value-set');
    expect(result.instanceOf).toBe('ValueSet');
    expect(result.usage).toBe('Example');
    expect(result.title).toBe('My Title');
    expect(result.description).toBe('My Description');
  });

  it('should convert a non-example Instance with additional metadata from an IG', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-valueset-with-id.json'), 'utf-8')
    );
    simpleIg.definition = {
      resource: [
        {
          reference: { reference: 'ValueSet/my.value-set' },
          name: 'My Title',
          description: 'My Description'
        }
      ]
    };
    const result = InstanceProcessor.process(input, simpleIg, defs);
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('my.value-set');
    expect(result.instanceOf).toBe('ValueSet');
    expect(result.usage).toBe('Definition');
    expect(result.title).toBe('My Title');
    expect(result.description).toBe('My Description');
  });

  describe('#extractRules', () => {
    it('should add top level assignment rules to an Instance', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'complex-patient.json'), 'utf-8')
      );
      const result = InstanceProcessor.process(input, simpleIg, defs);
      expect(result).toBeInstanceOf(ExportableInstance);
      expect(result.name).toBe('complex-patient');
      expect(result.rules).toHaveLength(21); // One rule for every value set since there are no optimizations for things like codes

      const genderAssignmentRule = new ExportableAssignmentRule('gender');
      genderAssignmentRule.value = new fshtypes.FshCode('female');
      const birthDateAssignmentRule = new ExportableAssignmentRule('birthDate');
      birthDateAssignmentRule.value = '1955-05-20';

      expect(result.rules).toContainEqual(genderAssignmentRule);
      expect(result.rules).toContainEqual(birthDateAssignmentRule);
    });

    it('should add array value assignment rules to an Instance', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'complex-patient.json'), 'utf-8')
      );
      const result = InstanceProcessor.process(input, simpleIg, defs);
      expect(result).toBeInstanceOf(ExportableInstance);
      expect(result.name).toBe('complex-patient');
      expect(result.rules).toHaveLength(21); // One rule for every value set since there are no optimizations for things like codes

      const ombCategoryUrl = new ExportableAssignmentRule('extension[0].extension[0].url');
      ombCategoryUrl.value = 'ombCategory';
      const ombCategoryCode = new ExportableAssignmentRule(
        'extension[0].extension[0].valueCoding.code'
      );
      ombCategoryCode.value = '1002-5';
      const ombCategoryValue = new ExportableAssignmentRule(
        'extension[0].extension[0].valueCoding.system'
      );
      ombCategoryValue.value = 'urn:oid:2.16.840.1.113883.6.238';
      const ombCategoryDisplay = new ExportableAssignmentRule(
        'extension[0].extension[0].valueCoding.display'
      );
      ombCategoryDisplay.value = 'American Indian or Alaska Native';
      const usCoreRaceUrl = new ExportableAssignmentRule('extension[0].url');
      usCoreRaceUrl.value = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race';

      const birthSexUrl = new ExportableAssignmentRule('extension[1].url');
      birthSexUrl.value = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex';
      const birthSexValueCode = new ExportableAssignmentRule('extension[1].valueCode');
      birthSexValueCode.value = new fshtypes.FshCode('F');

      const familyName = new ExportableAssignmentRule('name[0].family');
      familyName.value = 'Anyperson';
      const givenName1 = new ExportableAssignmentRule('name[0].given[0]');
      givenName1.value = 'Eve';
      const givenName2 = new ExportableAssignmentRule('name[0].given[1]');
      givenName2.value = 'A.';

      const addressLine = new ExportableAssignmentRule('address[0].line[0]');
      addressLine.value = '456 Smith Lane';
      const addressCity = new ExportableAssignmentRule('address[0].city');
      addressCity.value = 'Anytown';
      const addressState = new ExportableAssignmentRule('address[0].state');
      addressState.value = 'MA';
      const addressPostalCode = new ExportableAssignmentRule('address[0].postalCode');
      addressPostalCode.value = '12345';
      const addressCountry = new ExportableAssignmentRule('address[0].country');
      addressCountry.value = 'US';

      expect(result.rules).toContainEqual(ombCategoryUrl);
      expect(result.rules).toContainEqual(ombCategoryCode);
      expect(result.rules).toContainEqual(ombCategoryValue);
      expect(result.rules).toContainEqual(ombCategoryDisplay);
      expect(result.rules).toContainEqual(usCoreRaceUrl);
      expect(result.rules).toContainEqual(birthSexUrl);
      expect(result.rules).toContainEqual(birthSexValueCode);
      expect(result.rules).toContainEqual(givenName1);
      expect(result.rules).toContainEqual(givenName2);
      expect(result.rules).toContainEqual(addressLine);
      expect(result.rules).toContainEqual(addressCity);
      expect(result.rules).toContainEqual(addressState);
      expect(result.rules).toContainEqual(addressPostalCode);
      expect(result.rules).toContainEqual(addressCountry);
    });

    it('should add assignment rule for children of primitive values', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'complex-patient.json'), 'utf-8')
      );
      const result = InstanceProcessor.process(input, simpleIg, defs);
      expect(result).toBeInstanceOf(ExportableInstance);
      expect(result.name).toBe('complex-patient');

      const countryExtensionUrl = new ExportableAssignmentRule(
        'address[0].country.extension[0].url'
      );
      countryExtensionUrl.value = 'http://foo.com';
      const countryExtensionValue = new ExportableAssignmentRule(
        'address[0].country.extension[0].valueCode'
      );
      countryExtensionValue.value = new fshtypes.FshCode('bar');
      expect(result.rules).toContainEqual(countryExtensionUrl);
      expect(result.rules).toContainEqual(countryExtensionValue);
    });

    it('should use entry resource type to determine assignment rule value types on bundle entry resources', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-bundle.json'), 'utf-8')
      );
      const result = InstanceProcessor.process(input, simpleIg, defs);
      expect(result).toBeInstanceOf(ExportableInstance);
      expect(result.name).toBe('simple-bundle');

      const status = new ExportableAssignmentRule('entry[0].resource.status');
      status.value = new fshtypes.FshCode('final');
      expect(result.rules).toContainEqual(status);
    });

    it('should use contained resource type to determine assignment rule value type on contained resources', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'patient-with-contained.json'), 'utf-8')
      );
      const result = InstanceProcessor.process(input, simpleIg, defs);
      expect(result).toBeInstanceOf(ExportableInstance);
      expect(result.name).toBe('patient-with-contained');

      const status = new ExportableAssignmentRule('contained[0].status');
      status.value = new fshtypes.FshCode('final');
      expect(result.rules).toContainEqual(status);
    });

    it('should use ResourceType and add assignment rules when InstanceOf is a profile that is not found', () => {
      const input = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, 'fixtures', 'invalid-parent-profile-patient.json'),
          'utf-8'
        )
      );
      const result = InstanceProcessor.process(input, simpleIg, defs);
      expect(result).toBeInstanceOf(ExportableInstance);
      expect(result.name).toBe('invalid-patient-parent');
      expect(loggerSpy.getAllMessages()).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(/InstanceOf definition not found/s);
      expect(result.rules).toHaveLength(2); // Add rules after using ResourceType as parent
    });

    it('should not add assignment rules when ResourceType of Instance is not found', () => {
      const input = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, 'fixtures', 'invalid-parent-profile-patient.json'),
          'utf-8'
        )
      );
      // Change the resource type to be an invalid FHIR resourceType.
      // This should never really happen and is just for testing purposes.
      input.resourceType = 'FakePatient';
      const result = InstanceProcessor.process(input, simpleIg, defs);
      expect(result).toBeInstanceOf(ExportableInstance);
      expect(result.name).toBe('invalid-patient-parent');
      expect(loggerSpy.getAllMessages()).toHaveLength(2);
      expect(loggerSpy.getLastMessage('warn')).toMatch(/InstanceOf definition not found/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/Definition of ResourceType not found/s);
      expect(result.rules).toHaveLength(0); // Do not add rules
    });
  });
});
