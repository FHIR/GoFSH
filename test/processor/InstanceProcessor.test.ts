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
    expect(result.name).toBe('simple-patient-of-Patient');
    expect(result.id).toBe('simple-patient');
    expect(result.instanceOf).toBe('Patient');
    expect(result.usage).toBe('Example');
  });

  it('should convert an example Instance with one entry in meta.profile as the InstanceOf when that entry resolves to an SD', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'profiled-patient.json'), 'utf-8')
    );
    const result = InstanceProcessor.process(input, simpleIg, defs);
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe(
      'profiled-patient-of-http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
    );
    expect(result.id).toBe('profiled-patient');
    expect(result.instanceOf).toBe(
      'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
    );
    expect(result.usage).toBe('Example');
    expect(result.rules).toHaveLength(0);
  });

  it('should convert an example Instance with one entry in meta.profile as the InstanceOf when the metaProfile option is only-one and that entry resolves to an SD', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'profiled-patient.json'), 'utf-8')
    );
    const result = InstanceProcessor.process(input, simpleIg, defs, { metaProfile: 'only-one' });
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe(
      'profiled-patient-of-http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
    );
    expect(result.id).toBe('profiled-patient');
    expect(result.instanceOf).toBe(
      'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
    );
    expect(result.usage).toBe('Example');
    expect(result.rules).toHaveLength(0);
  });

  it('should convert an example Instance with one entry in meta.profile as the InstanceOf when the metaProfile option is first and that entry resolves to an SD', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'profiled-patient.json'), 'utf-8')
    );
    const result = InstanceProcessor.process(input, simpleIg, defs, { metaProfile: 'first' });
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe(
      'profiled-patient-of-http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
    );
    expect(result.id).toBe('profiled-patient');
    expect(result.instanceOf).toBe(
      'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
    );
    expect(result.usage).toBe('Example');
    expect(result.rules).toHaveLength(0);
  });

  it('should convert an example Instance and use the resourceType as InstanceOf when the metaProfile option is none', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'profiled-patient.json'), 'utf-8')
    );
    const result = InstanceProcessor.process(input, simpleIg, defs, { metaProfile: 'none' });
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('profiled-patient-of-Patient');
    expect(result.id).toBe('profiled-patient');
    expect(result.instanceOf).toBe('Patient');
    expect(result.usage).toBe('Example');
    expect(result.rules).toHaveLength(1);

    const metaProfileRule = new ExportableAssignmentRule('meta.profile[0]');
    metaProfileRule.value = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient';
    expect(result.rules).toContainEqual(metaProfileRule);
  });

  it('should convert an example Instance with one entry in meta.profile using the base resource when that entry does not resolve to an SD', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'profiled-patient.json'), 'utf-8')
    );
    input.meta.profile[0] = 'http://example.org/StructureDefinition/some-unknown-profile';
    const result = InstanceProcessor.process(input, simpleIg, defs);
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe(
      'profiled-patient-of-http://example.org/StructureDefinition/some-unknown-profile'
    );
    expect(result.id).toBe('profiled-patient');
    expect(result.instanceOf).toBe('Patient');
    expect(result.usage).toBe('Example');

    const expectedMetaProfile = new ExportableAssignmentRule('meta.profile[0]');
    expectedMetaProfile.value = 'http://example.org/StructureDefinition/some-unknown-profile';
    expect(result.rules).toContainEqual(expectedMetaProfile);

    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /InstanceOf definition not found for profiled-patient/s
    );
  });

  it('should convert an example Instance with one entry in meta.profile using the base resource when the metaProfile option is only-one and that entry does not resolve to an SD', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'profiled-patient.json'), 'utf-8')
    );
    input.meta.profile[0] = 'http://example.org/StructureDefinition/some-unknown-profile';
    const result = InstanceProcessor.process(input, simpleIg, defs, { metaProfile: 'only-one' });
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe(
      'profiled-patient-of-http://example.org/StructureDefinition/some-unknown-profile'
    );
    expect(result.id).toBe('profiled-patient');
    expect(result.instanceOf).toBe('Patient');
    expect(result.usage).toBe('Example');

    const expectedMetaProfile = new ExportableAssignmentRule('meta.profile[0]');
    expectedMetaProfile.value = 'http://example.org/StructureDefinition/some-unknown-profile';
    expect(result.rules).toContainEqual(expectedMetaProfile);

    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /InstanceOf definition not found for profiled-patient/s
    );
  });

  it('should convert an example Instance with one entry in meta.profile using the base resource when the metaProfile option is first and that entry does not resolve to an SD', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'profiled-patient.json'), 'utf-8')
    );
    input.meta.profile[0] = 'http://example.org/StructureDefinition/some-unknown-profile';
    const result = InstanceProcessor.process(input, simpleIg, defs, { metaProfile: 'first' });
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe(
      'profiled-patient-of-http://example.org/StructureDefinition/some-unknown-profile'
    );
    expect(result.id).toBe('profiled-patient');
    expect(result.instanceOf).toBe('Patient');
    expect(result.usage).toBe('Example');

    const expectedMetaProfile = new ExportableAssignmentRule('meta.profile[0]');
    expectedMetaProfile.value = 'http://example.org/StructureDefinition/some-unknown-profile';
    expect(result.rules).toContainEqual(expectedMetaProfile);

    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /InstanceOf definition not found for profiled-patient/s
    );
  });

  it('should convert an example Instance with one entry in meta.profile using the base resource when the metaProfile option is none and that entry does not resolve to an SD', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'profiled-patient.json'), 'utf-8')
    );
    input.meta.profile[0] = 'http://example.org/StructureDefinition/some-unknown-profile';
    const result = InstanceProcessor.process(input, simpleIg, defs, { metaProfile: 'none' });
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('profiled-patient-of-Patient');
    expect(result.id).toBe('profiled-patient');
    expect(result.instanceOf).toBe('Patient');
    expect(result.usage).toBe('Example');

    const expectedMetaProfile = new ExportableAssignmentRule('meta.profile[0]');
    expectedMetaProfile.value = 'http://example.org/StructureDefinition/some-unknown-profile';
    expect(result.rules).toContainEqual(expectedMetaProfile);

    expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
  });

  it('should convert an example Instance with multiple entries in meta.profile using the base resource as the InstanceOf', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'profiled-patient.json'), 'utf-8')
    );
    input.meta.profile.push('http://example.org/StructureDefinition/some-unknown-profile');
    const result = InstanceProcessor.process(input, simpleIg, defs);
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('profiled-patient-of-Patient');
    expect(result.id).toBe('profiled-patient');
    expect(result.instanceOf).toBe('Patient');
    expect(result.usage).toBe('Example');

    const firstProfile = new ExportableAssignmentRule('meta.profile[0]');
    firstProfile.value = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient';
    const secondProfile = new ExportableAssignmentRule('meta.profile[1]');
    secondProfile.value = 'http://example.org/StructureDefinition/some-unknown-profile';
    expect(result.rules).toHaveLength(2);
    expect(result.rules).toContainEqual(firstProfile);
    expect(result.rules).toContainEqual(secondProfile);

    // Even though the second entry in meta.profile won't resolve, we don't try to resolve them when there is more than one.
    expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
  });

  it('should convert an example Instance with multiple entries in meta.profile using the base resource as the InstanceOf when the metaProfile option is only-one', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'profiled-patient.json'), 'utf-8')
    );
    input.meta.profile.push('http://example.org/StructureDefinition/some-unknown-profile');
    const result = InstanceProcessor.process(input, simpleIg, defs, { metaProfile: 'only-one' });
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('profiled-patient-of-Patient');
    expect(result.id).toBe('profiled-patient');
    expect(result.instanceOf).toBe('Patient');
    expect(result.usage).toBe('Example');

    const firstProfile = new ExportableAssignmentRule('meta.profile[0]');
    firstProfile.value = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient';
    const secondProfile = new ExportableAssignmentRule('meta.profile[1]');
    secondProfile.value = 'http://example.org/StructureDefinition/some-unknown-profile';
    expect(result.rules).toHaveLength(2);
    expect(result.rules).toContainEqual(firstProfile);
    expect(result.rules).toContainEqual(secondProfile);

    expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
  });

  it('should convert an example Instance with multiple entries in meta.profile using the first profile when the metaProfile option is first', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'profiled-patient.json'), 'utf-8')
    );
    input.meta.profile.push('http://example.org/StructureDefinition/some-unknown-profile');
    const result = InstanceProcessor.process(input, simpleIg, defs, { metaProfile: 'first' });
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe(
      'profiled-patient-of-http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
    );
    expect(result.id).toBe('profiled-patient');
    expect(result.instanceOf).toBe(
      'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
    );
    expect(result.usage).toBe('Example');

    const firstProfile = new ExportableAssignmentRule('meta.profile[0]');
    firstProfile.value = 'http://example.org/StructureDefinition/some-unknown-profile';
    expect(result.rules).toHaveLength(1);
    expect(result.rules).toContainEqual(firstProfile);

    expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
  });

  it('should convert an example Instance with multiple entries in meta.profile using the base resource as the InstanceOf when the metaProfile option is none', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'profiled-patient.json'), 'utf-8')
    );
    input.meta.profile.push('http://example.org/StructureDefinition/some-unknown-profile');
    const result = InstanceProcessor.process(input, simpleIg, defs, { metaProfile: 'none' });
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('profiled-patient-of-Patient');
    expect(result.id).toBe('profiled-patient');
    expect(result.instanceOf).toBe('Patient');
    expect(result.usage).toBe('Example');

    const firstProfile = new ExportableAssignmentRule('meta.profile[0]');
    firstProfile.value = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient';
    const secondProfile = new ExportableAssignmentRule('meta.profile[1]');
    secondProfile.value = 'http://example.org/StructureDefinition/some-unknown-profile';
    expect(result.rules).toHaveLength(2);
    expect(result.rules).toContainEqual(firstProfile);
    expect(result.rules).toContainEqual(secondProfile);

    expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
  });

  it('should convert the simplest vocabulary Instance', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-valueset-with-id.json'), 'utf-8')
    );
    const result = InstanceProcessor.process(input, simpleIg, defs);
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('my.value-set-of-ValueSet');
    expect(result.id).toBe('my.value-set');
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
    expect(result.name).toBe('my.value-set-of-ValueSet');
    expect(result.id).toBe('my.value-set');
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
    expect(result.name).toBe('my.value-set-of-ValueSet');
    expect(result.id).toBe('my.value-set');
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
      expect(result.name).toBe(
        'complex-patient-of-http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
      );
      expect(result.id).toBe('complex-patient');
      expect(result.rules).toHaveLength(23); // One rule for every value set since there are no optimizations for things like codes

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
      expect(result.name).toBe(
        'complex-patient-of-http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
      );
      expect(result.id).toBe('complex-patient');
      expect(result.rules).toHaveLength(23); // One rule for every value set since there are no optimizations for things like codes

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
      expect(result.name).toBe(
        'complex-patient-of-http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'
      );
      expect(result.id).toBe('complex-patient');

      const fooExtensionUrl = new ExportableAssignmentRule('address[0].country.extension[0].url');
      fooExtensionUrl.value = 'http://foo.com';
      const fooExtensionValue = new ExportableAssignmentRule(
        'address[0].country.extension[0].valueCode'
      );
      fooExtensionValue.value = new fshtypes.FshCode('bar');
      const exampleExtensionUrl = new ExportableAssignmentRule(
        'address[0].country.extension[1].url'
      );
      exampleExtensionUrl.value = 'http://example.com';
      const exampleExtensionValue = new ExportableAssignmentRule(
        'address[0].country.extension[1].valueString'
      );
      exampleExtensionValue.value = 'This "value" is\nin the second extension.';
      expect(result.rules).toContainEqual(fooExtensionUrl);
      expect(result.rules).toContainEqual(fooExtensionValue);
    });

    it('should use entry resource type to determine assignment rule value types on bundle entry resources', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-bundle.json'), 'utf-8')
      );
      const result = InstanceProcessor.process(input, simpleIg, defs);
      expect(result).toBeInstanceOf(ExportableInstance);
      expect(result.name).toBe('simple-bundle-of-Bundle');
      expect(result.id).toBe('simple-bundle');

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
      expect(result.name).toBe('patient-with-contained-of-Patient');
      expect(result.id).toBe('patient-with-contained');

      const status = new ExportableAssignmentRule('contained[0].status');
      status.value = new fshtypes.FshCode('final');
      expect(result.rules).toContainEqual(status);
    });

    it('should use ResourceType and add assignment rules when there is one entry in meta.profile that is not found', () => {
      const input = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, 'fixtures', 'invalid-parent-profile-patient.json'),
          'utf-8'
        )
      );
      const result = InstanceProcessor.process(input, simpleIg, defs);
      expect(result).toBeInstanceOf(ExportableInstance);
      expect(result.name).toBe(
        'invalid-patient-parent-of-http://hl7.org/fhir/us/core/StructureDefinition/fake-parent'
      );
      expect(result.id).toBe('invalid-patient-parent');
      expect(loggerSpy.getAllMessages()).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(/InstanceOf definition not found/s);
      expect(result.rules).toHaveLength(3); // Add rules after using ResourceType as parent

      const expectedMetaProfile = new ExportableAssignmentRule('meta.profile[0]');
      expectedMetaProfile.value = 'http://hl7.org/fhir/us/core/StructureDefinition/fake-parent';
      const expectedGender = new ExportableAssignmentRule('gender');
      expectedGender.value = new fshtypes.FshCode('female');
      const expectedBirthDate = new ExportableAssignmentRule('birthDate');
      expectedBirthDate.value = '1955-05-20';

      expect(result.rules).toContainEqual(expectedMetaProfile);
      expect(result.rules).toContainEqual(expectedGender);
      expect(result.rules).toContainEqual(expectedBirthDate);
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
      expect(result.name).toBe(
        'invalid-patient-parent-of-http://hl7.org/fhir/us/core/StructureDefinition/fake-parent'
      );
      expect(result.id).toBe('invalid-patient-parent');
      expect(loggerSpy.getAllMessages()).toHaveLength(2);
      expect(loggerSpy.getLastMessage('warn')).toMatch(/InstanceOf definition not found/s);
      expect(loggerSpy.getLastMessage('error')).toMatch(/Definition of ResourceType not found/s);
      expect(result.rules).toHaveLength(0); // Do not add rules
    });

    it('should not add assignment rules when the value of the rule is empty', () => {
      const input = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'fixtures', 'complex-patient.json'), 'utf-8')
      );
      // turn name[0].given into an empty list
      input.name[0].given = [];
      const result = InstanceProcessor.process(input, simpleIg, defs);
      expect(result).toBeInstanceOf(ExportableInstance);
      // There should be no rule created with path name[0].given
      expect(result.rules).not.toContainEqual(
        expect.objectContaining({
          path: 'name[0].given'
        })
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        'Value in Instance complex-patient-of-http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient at path name[0].given is empty.'
      );
    });
  });
});
