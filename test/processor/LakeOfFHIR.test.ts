import fs from 'fs-extra';
import path from 'path';
import { utils } from 'fsh-sushi';
import { LakeOfFHIR, WildFHIR } from '../../src/processor';
import { loggerSpy } from '../helpers/loggerSpy';

describe('LakeOfHIR', () => {
  let lake: LakeOfFHIR;

  beforeAll(async () => {
    lake = new LakeOfFHIR(
      getWildFHIRs(
        'logical-profile.json',
        'simple-profile.json',
        'simple-extension.json',
        'simple-logical-model.json',
        'simple-resource.json',
        'simple-codesystem.json',
        'simple-valueset.json',
        'simple-ig.json',
        'rocky-balboa.json',
        'unsupported-valueset.json',
        'unsupported-codesystem.json',
        'my-string-profile.json'
      )
    );
    await lake.prepareDefs();
  });

  beforeEach(() => {
    loggerSpy.reset();
  });

  describe('#constructor', () => {
    it('should store all the passed in values', () => {
      expect(lake.docs).toHaveLength(12);
      expect(lake.docs[0].content.id).toBe('logical.profile');
      expect(lake.docs[1].content.id).toBe('simple.profile');
      expect(lake.docs[2].content.id).toBe('simple.extension');
      expect(lake.docs[3].content.id).toBe('simple.logical');
      expect(lake.docs[4].content.id).toBe('simple.resource');
      expect(lake.docs[5].content.id).toBe('simple.codesystem');
      expect(lake.docs[6].content.id).toBe('simple.valueset');
      expect(lake.docs[7].content.id).toBe('simple.ig');
      expect(lake.docs[8].content.id).toBe('rocky.balboa');
      expect(lake.docs[9].content.id).toBe('unsupported.valueset');
      expect(lake.docs[10].content.id).toBe(undefined);
      expect(lake.docs[11].content.id).toBe('my.string.profile');
    });
  });

  describe('#getAllStructureDefinitions', () => {
    it('should get all structure definitions', () => {
      const results = lake.getAllStructureDefinitions();
      expect(results).toHaveLength(6);
      expect(results[0].content.id).toBe('logical.profile');
      expect(results[1].content.id).toBe('simple.profile');
      expect(results[2].content.id).toBe('simple.extension');
      expect(results[3].content.id).toBe('simple.logical');
      expect(results[4].content.id).toBe('simple.resource');
      expect(results[5].content.id).toBe('my.string.profile');
    });
  });

  describe('#getAllValueSets', () => {
    it('should get all value sets by default', () => {
      const results = lake.getAllValueSets();
      expect(results).toHaveLength(2);
      expect(results[0].content.id).toBe('simple.valueset');
      expect(results[1].content.id).toBe('unsupported.valueset');
    });

    it('should get all value sets when includeUnsupported is true', () => {
      const results = lake.getAllValueSets(true);
      expect(results).toHaveLength(2);
      expect(results[0].content.id).toBe('simple.valueset');
      expect(results[1].content.id).toBe('unsupported.valueset');
    });

    it('should get only supported value sets when includeUnsupported is false', () => {
      const results = lake.getAllValueSets(false);
      expect(results).toHaveLength(1);
      expect(results[0].content.id).toBe('simple.valueset');
    });
  });

  describe('#getAllCodeSystems', () => {
    it('should get all code systems by default', () => {
      const results = lake.getAllCodeSystems();
      expect(results).toHaveLength(2);
      expect(results[0].content.id).toBe('simple.codesystem');
      expect(results[1].content.id).toBe(undefined);
    });

    it('should get all code systems when includeUnsupported is true', () => {
      const results = lake.getAllCodeSystems(true);
      expect(results).toHaveLength(2);
      expect(results[0].content.id).toBe('simple.codesystem');
      expect(results[1].content.id).toBe(undefined);
    });

    it('should get only supported code systems when includeUnsupported is false', () => {
      const results = lake.getAllCodeSystems(false);
      expect(results).toHaveLength(1);
      expect(results[0].content.id).toBe('simple.codesystem');
    });
  });

  describe('#getAllImplementationGuides', () => {
    it('should get all implementation guides', () => {
      const results = lake.getAllImplementationGuides();
      expect(results).toHaveLength(1);
      expect(results[0].content.id).toBe('simple.ig');
    });
  });

  describe('#getAllInstances', () => {
    it('should get all non-IG/SD/VS/CS resources by default', () => {
      const results = lake.getAllInstances();
      expect(results).toHaveLength(1);
      expect(results[0].content.id).toBe('rocky.balboa');
    });

    it('should get all non-IG/SD/VS/CS resources when includeUnsupportedValueSets is false', () => {
      const results = lake.getAllInstances(false);
      expect(results).toHaveLength(1);
      expect(results[0].content.id).toBe('rocky.balboa');
    });

    it('should also get unsupported value sets and code systems when includeUnsupportedTerminologyResources is true', () => {
      const results = lake.getAllInstances(true);
      expect(results).toHaveLength(3);
      expect(results[0].content.id).toBe('rocky.balboa');
      expect(results[1].content.id).toBe('unsupported.valueset');
      expect(results[2].content.id).toBe(undefined);
    });
  });

  describe('#fishForFHIR', () => {
    it('should fish by name', () => {
      expect(lake.fishForFHIR('SimpleProfile').id).toBe('simple.profile');
      expect(lake.fishForFHIR('SimpleExtension').id).toBe('simple.extension');
      expect(lake.fishForFHIR('SimpleLogicalModel').id).toBe('simple.logical');
      expect(lake.fishForFHIR('SimpleResource').id).toBe('simple.resource');
      expect(lake.fishForFHIR('SimpleCodeSystem').id).toBe('simple.codesystem');
      expect(lake.fishForFHIR('SimpleValueSet').id).toBe('simple.valueset');
    });

    it('should fish by name and Type', () => {
      expect(lake.fishForFHIR('SimpleProfile', utils.Type.Profile).id).toBe('simple.profile');
      expect(lake.fishForFHIR('SimpleProfile', utils.Type.Extension)).toBeUndefined();
      expect(lake.fishForFHIR('SimpleExtension', utils.Type.Extension).id).toBe('simple.extension');
      expect(lake.fishForFHIR('SimpleExtension', utils.Type.Profile)).toBeUndefined();
      expect(lake.fishForFHIR('SimpleLogicalModel', utils.Type.Logical).id).toBe('simple.logical');
      expect(lake.fishForFHIR('SimpleLogicalModel', utils.Type.Resource)).toBeUndefined();
      expect(lake.fishForFHIR('SimpleResource', utils.Type.Resource).id).toBe('simple.resource');
      expect(lake.fishForFHIR('SimpleResource', utils.Type.Logical)).toBeUndefined();
      expect(lake.fishForFHIR('SimpleCodeSystem', utils.Type.CodeSystem).id).toBe(
        'simple.codesystem'
      );
      expect(lake.fishForFHIR('SimpleCodeSystem', utils.Type.ValueSet)).toBeUndefined();
      expect(lake.fishForFHIR('SimpleValueSet', utils.Type.ValueSet).id).toBe('simple.valueset');
      expect(lake.fishForFHIR('SimpleValueSet', utils.Type.CodeSystem)).toBeUndefined();
    });

    it('should fish by id', () => {
      expect(lake.fishForFHIR('simple.profile').name).toBe('SimpleProfile');
      expect(lake.fishForFHIR('simple.extension').name).toBe('SimpleExtension');
      expect(lake.fishForFHIR('simple.logical').name).toBe('SimpleLogicalModel');
      expect(lake.fishForFHIR('simple.resource').name).toBe('SimpleResource');
      expect(lake.fishForFHIR('simple.codesystem').name).toBe('SimpleCodeSystem');
      expect(lake.fishForFHIR('simple.valueset').name).toBe('SimpleValueSet');
    });

    it('should fish by id and Type', () => {
      expect(lake.fishForFHIR('simple.profile', utils.Type.Profile).name).toBe('SimpleProfile');
      expect(lake.fishForFHIR('simple.profile', utils.Type.Extension)).toBeUndefined();
      expect(lake.fishForFHIR('simple.extension', utils.Type.Extension).name).toBe(
        'SimpleExtension'
      );
      expect(lake.fishForFHIR('simple.extension', utils.Type.Profile)).toBeUndefined();
      expect(lake.fishForFHIR('simple.logical', utils.Type.Logical).name).toBe(
        'SimpleLogicalModel'
      );
      expect(lake.fishForFHIR('simple.logical', utils.Type.Resource)).toBeUndefined();
      expect(lake.fishForFHIR('simple.resource', utils.Type.Resource).name).toBe('SimpleResource');
      expect(lake.fishForFHIR('simple.resource', utils.Type.Logical)).toBeUndefined();
      expect(lake.fishForFHIR('simple.codesystem', utils.Type.CodeSystem).name).toBe(
        'SimpleCodeSystem'
      );
      expect(lake.fishForFHIR('simple.codesystem', utils.Type.ValueSet)).toBeUndefined();
      expect(lake.fishForFHIR('simple.valueset', utils.Type.ValueSet).name).toBe('SimpleValueSet');
      expect(lake.fishForFHIR('simple.valueset', utils.Type.CodeSystem)).toBeUndefined();
    });

    it('should fish by url', () => {
      expect(
        lake.fishForFHIR('http://example.org/tests/StructureDefinition/simple.profile').id
      ).toBe('simple.profile');
      expect(
        lake.fishForFHIR('http://example.org/tests/StructureDefinition/simple.extension').id
      ).toBe('simple.extension');
      expect(lake.fishForFHIR('http://example.org/StructureDefinition/SimpleLogicalModel').id).toBe(
        'simple.logical'
      );
      expect(lake.fishForFHIR('http://example.org/StructureDefinition/SimpleResource').id).toBe(
        'simple.resource'
      );
      expect(lake.fishForFHIR('http://example.org/tests/CodeSystem/simple.codesystem').id).toBe(
        'simple.codesystem'
      );
      expect(lake.fishForFHIR('http://example.org/tests/ValueSet/simple.valueset').id).toBe(
        'simple.valueset'
      );
    });

    it('should fish by url and Type', () => {
      expect(
        lake.fishForFHIR(
          'http://example.org/tests/StructureDefinition/simple.profile',
          utils.Type.Profile
        ).id
      ).toBe('simple.profile');
      expect(
        lake.fishForFHIR(
          'http://example.org/tests/StructureDefinition/simple.profile',
          utils.Type.Extension
        )
      ).toBeUndefined();
      expect(
        lake.fishForFHIR(
          'http://example.org/tests/StructureDefinition/simple.extension',
          utils.Type.Extension
        ).id
      ).toBe('simple.extension');
      expect(
        lake.fishForFHIR(
          'http://example.org/tests/StructureDefinition/simple.extension',
          utils.Type.Profile
        )
      ).toBeUndefined();
      expect(
        lake.fishForFHIR(
          'http://example.org/StructureDefinition/SimpleLogicalModel',
          utils.Type.Logical
        ).id
      ).toBe('simple.logical');
      expect(
        lake.fishForFHIR(
          'http://example.org/StructureDefinition/SimpleLogicalModel',
          utils.Type.Resource
        )
      ).toBeUndefined();
      expect(
        lake.fishForFHIR(
          'http://example.org/StructureDefinition/SimpleResource',
          utils.Type.Resource
        ).id
      ).toBe('simple.resource');
      expect(
        lake.fishForFHIR(
          'http://example.org/StructureDefinition/SimpleResource',
          utils.Type.Logical
        )
      ).toBeUndefined();
      expect(
        lake.fishForFHIR(
          'http://example.org/tests/CodeSystem/simple.codesystem',
          utils.Type.CodeSystem
        ).id
      ).toBe('simple.codesystem');
      expect(
        lake.fishForFHIR(
          'http://example.org/tests/CodeSystem/simple.codesystem',
          utils.Type.ValueSet
        )
      ).toBeUndefined();
      expect(
        lake.fishForFHIR('http://example.org/tests/ValueSet/simple.valueset', utils.Type.ValueSet)
          .id
      ).toBe('simple.valueset');
      expect(
        lake.fishForFHIR('http://example.org/tests/ValueSet/simple.valueset', utils.Type.CodeSystem)
      ).toBeUndefined();
    });
  });

  describe('#fishForMetadata', () => {
    it('should fish by name', () => {
      expect(lake.fishForMetadata('SimpleProfile').id).toBe('simple.profile');
      expect(lake.fishForMetadata('SimpleExtension').id).toBe('simple.extension');
      expect(lake.fishForMetadata('SimpleLogicalModel').id).toBe('simple.logical');
      expect(lake.fishForMetadata('SimpleResource').id).toBe('simple.resource');
      expect(lake.fishForMetadata('SimpleCodeSystem').id).toBe('simple.codesystem');
      expect(lake.fishForMetadata('SimpleValueSet').id).toBe('simple.valueset');
    });

    it('should fish by name and Type', () => {
      expect(lake.fishForMetadata('SimpleProfile', utils.Type.Profile).id).toBe('simple.profile');
      expect(lake.fishForMetadata('SimpleProfile', utils.Type.Extension)).toBeUndefined();
      expect(lake.fishForMetadata('SimpleExtension', utils.Type.Extension).id).toBe(
        'simple.extension'
      );
      expect(lake.fishForMetadata('SimpleExtension', utils.Type.Profile)).toBeUndefined();
      expect(lake.fishForMetadata('SimpleLogicalModel', utils.Type.Logical).id).toBe(
        'simple.logical'
      );
      expect(lake.fishForMetadata('SimpleLogicalModel', utils.Type.Resource)).toBeUndefined();
      expect(lake.fishForMetadata('SimpleResource', utils.Type.Resource).id).toBe(
        'simple.resource'
      );
      expect(lake.fishForMetadata('SimpleResource', utils.Type.Logical)).toBeUndefined();
      expect(lake.fishForMetadata('SimpleCodeSystem', utils.Type.CodeSystem).id).toBe(
        'simple.codesystem'
      );
      expect(lake.fishForMetadata('SimpleCodeSystem', utils.Type.ValueSet)).toBeUndefined();
      expect(lake.fishForMetadata('SimpleValueSet', utils.Type.ValueSet).id).toBe(
        'simple.valueset'
      );
      expect(lake.fishForMetadata('SimpleValueSet', utils.Type.CodeSystem)).toBeUndefined();
    });

    it('should fish by id', () => {
      expect(lake.fishForMetadata('simple.profile').name).toBe('SimpleProfile');
      expect(lake.fishForMetadata('simple.extension').name).toBe('SimpleExtension');
      expect(lake.fishForMetadata('simple.logical').name).toBe('SimpleLogicalModel');
      expect(lake.fishForMetadata('simple.resource').name).toBe('SimpleResource');
      expect(lake.fishForMetadata('simple.codesystem').name).toBe('SimpleCodeSystem');
      expect(lake.fishForMetadata('simple.valueset').name).toBe('SimpleValueSet');
    });

    it('should fish by id and Type', () => {
      expect(lake.fishForMetadata('simple.profile', utils.Type.Profile).name).toBe('SimpleProfile');
      expect(lake.fishForMetadata('simple.profile', utils.Type.Extension)).toBeUndefined();
      expect(lake.fishForMetadata('simple.extension', utils.Type.Extension).name).toBe(
        'SimpleExtension'
      );
      expect(lake.fishForMetadata('simple.extension', utils.Type.Profile)).toBeUndefined();
      expect(lake.fishForMetadata('simple.logical', utils.Type.Logical).name).toBe(
        'SimpleLogicalModel'
      );
      expect(lake.fishForMetadata('simple.logical', utils.Type.Resource)).toBeUndefined();
      expect(lake.fishForMetadata('simple.resource', utils.Type.Resource).name).toBe(
        'SimpleResource'
      );
      expect(lake.fishForMetadata('simple.resource', utils.Type.Logical)).toBeUndefined();
      expect(lake.fishForMetadata('simple.codesystem', utils.Type.CodeSystem).name).toBe(
        'SimpleCodeSystem'
      );
      expect(lake.fishForMetadata('simple.codesystem', utils.Type.ValueSet)).toBeUndefined();
      expect(lake.fishForMetadata('simple.valueset', utils.Type.ValueSet).name).toBe(
        'SimpleValueSet'
      );
      expect(lake.fishForMetadata('simple.valueset', utils.Type.CodeSystem)).toBeUndefined();
    });

    it('should fish by url', () => {
      expect(
        lake.fishForMetadata('http://example.org/tests/StructureDefinition/simple.profile').id
      ).toBe('simple.profile');
      expect(
        lake.fishForMetadata('http://example.org/tests/StructureDefinition/simple.extension').id
      ).toBe('simple.extension');
      expect(
        lake.fishForMetadata('http://example.org/StructureDefinition/SimpleLogicalModel').id
      ).toBe('simple.logical');
      expect(lake.fishForMetadata('http://example.org/StructureDefinition/SimpleResource').id).toBe(
        'simple.resource'
      );
      expect(lake.fishForMetadata('http://example.org/tests/CodeSystem/simple.codesystem').id).toBe(
        'simple.codesystem'
      );
      expect(lake.fishForMetadata('http://example.org/tests/ValueSet/simple.valueset').id).toBe(
        'simple.valueset'
      );
    });

    it('should fish by url and Type', () => {
      expect(
        lake.fishForMetadata(
          'http://example.org/tests/StructureDefinition/simple.profile',
          utils.Type.Profile
        ).id
      ).toBe('simple.profile');
      expect(
        lake.fishForMetadata(
          'http://example.org/tests/StructureDefinition/simple.profile',
          utils.Type.Extension
        )
      ).toBeUndefined();
      expect(
        lake.fishForMetadata(
          'http://example.org/tests/StructureDefinition/simple.extension',
          utils.Type.Extension
        ).id
      ).toBe('simple.extension');
      expect(
        lake.fishForMetadata(
          'http://example.org/tests/StructureDefinition/simple.extension',
          utils.Type.Profile
        )
      ).toBeUndefined();
      expect(
        lake.fishForMetadata(
          'http://example.org/StructureDefinition/SimpleLogicalModel',
          utils.Type.Logical
        ).id
      ).toBe('simple.logical');
      expect(
        lake.fishForMetadata(
          'http://example.org/StructureDefinition/SimpleLogicalModel',
          utils.Type.Resource
        )
      ).toBeUndefined();
      expect(
        lake.fishForMetadata(
          'http://example.org/StructureDefinition/SimpleResource',
          utils.Type.Logical
        )
      ).toBeUndefined();
      expect(
        lake.fishForMetadata(
          'http://example.org/tests/CodeSystem/simple.codesystem',
          utils.Type.CodeSystem
        ).id
      ).toBe('simple.codesystem');
      expect(
        lake.fishForMetadata(
          'http://example.org/tests/CodeSystem/simple.codesystem',
          utils.Type.ValueSet
        )
      ).toBeUndefined();
      expect(
        lake.fishForMetadata(
          'http://example.org/tests/ValueSet/simple.valueset',
          utils.Type.ValueSet
        ).id
      ).toBe('simple.valueset');
      expect(
        lake.fishForMetadata(
          'http://example.org/tests/ValueSet/simple.valueset',
          utils.Type.CodeSystem
        )
      ).toBeUndefined();
    });
  });

  describe('#removeDuplicateDefinitions', () => {
    it('should log an error and remove definitions with the same resourceType and id as a previous definition', () => {
      lake = new LakeOfFHIR(
        getWildFHIRs('simple-profile.json', 'simple-profile.json', 'simple-extension.json')
      );

      const results = lake.getAllStructureDefinitions();
      expect(results).toHaveLength(3);
      expect(results[0].content.id).toBe('simple.profile');
      expect(results[1].content.id).toBe('simple.profile');
      expect(results[2].content.id).toBe('simple.extension');

      lake.removeDuplicateDefinitions();
      const noDupResults = lake.getAllStructureDefinitions();
      expect(noDupResults).toHaveLength(2);
      expect(noDupResults[0].content.id).toBe('simple.profile');
      expect(noDupResults[1].content.id).toBe('simple.extension');

      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Encountered 1 definition\(s\) with the same resourceType and id as a previous definition./
      );
    });
  });

  describe('#assignMissingIds', () => {
    it('should log a warning and set a missing id based on name for Conformance and Terminology instances', () => {
      lake = new LakeOfFHIR(
        getWildFHIRs(
          'simple-message-definition-missing-id.json',
          'simple-capability-statement-missing-id.json'
        )
      );

      const results = lake.getAllInstances();
      expect(results).toHaveLength(2);
      expect(results[0].content.id).toBeUndefined();
      expect(results[1].content.id).toBeUndefined();

      lake.assignMissingIds();
      lake.removeDuplicateDefinitions(); // Run to ensure we no longer remove these as duplicates
      const noDupResults = lake.getAllInstances();
      expect(noDupResults).toHaveLength(2);
      expect(noDupResults[0].content.id).toBe('Example-Message-Definition');
      expect(noDupResults[1].content.id).toBe('Base-FHIR-Capability-Statement');

      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Encountered 2 definition\(s\) that were missing an id/
      );
    });

    it('should log a warning and set a missing id based on a counter if no name if available on Conformance and Terminology instances', () => {
      lake = new LakeOfFHIR(
        getWildFHIRs(
          'simple-message-definition-missing-id-name.json',
          'simple-capability-statement-missing-id-name.json'
        )
      );

      const results = lake.getAllInstances();
      expect(results).toHaveLength(2);
      expect(results[0].content.id).toBeUndefined();
      expect(results[1].content.id).toBeUndefined();

      lake.assignMissingIds();
      lake.removeDuplicateDefinitions(); // Run to ensure we no longer remove these as duplicates
      const noDupResults = lake.getAllInstances();
      expect(noDupResults).toHaveLength(2);
      expect(noDupResults[0].content.id).toBe('GOFSH-GENERATED-ID-0');
      expect(noDupResults[1].content.id).toBe('GOFSH-GENERATED-ID-1');

      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Encountered 2 definition\(s\) that were missing an id/
      );
    });

    it('should log a warning and set a missing id based on a counter for all other instances', () => {
      lake = new LakeOfFHIR(getWildFHIRs('patient-missing-id.json')); // Has a name, but it should not be used for id

      const results = lake.getAllInstances();
      expect(results).toHaveLength(1);
      expect(results[0].content.id).toBeUndefined();

      lake.assignMissingIds();
      lake.removeDuplicateDefinitions(); // Run to ensure we no longer remove these as duplicates
      const noDupResults = lake.getAllInstances();
      expect(noDupResults).toHaveLength(1);
      expect(noDupResults[0].content.id).toBe('GOFSH-GENERATED-ID-0'); // Generates an id, does not use the name of the definition

      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Encountered 1 definition\(s\) that were missing an id/
      );
    });

    it('should not set a missing id on StructureDefinition, ValueSet, and CodeSystem definitions and should not remove them as duplicates', () => {
      lake = new LakeOfFHIR(
        getWildFHIRs(
          'small-profile.json',
          'small-extension.json',
          'concept-codesystem.json',
          'simple-valueset-missing-id.json'
        )
      );

      const resultsSDs = lake.getAllStructureDefinitions();
      const resultsCSs = lake.getAllCodeSystems();
      const resultsVSs = lake.getAllValueSets();
      const results = [...resultsSDs, ...resultsCSs, ...resultsVSs];
      expect(results).toHaveLength(4);
      expect(results[0].content.id).toBeUndefined();
      expect(results[1].content.id).toBeUndefined();
      expect(results[2].content.id).toBeUndefined();
      expect(results[3].content.id).toBeUndefined();

      lake.assignMissingIds();
      lake.removeDuplicateDefinitions(); // Run to ensure we no longer remove these as duplicates
      const noDupResultsSDs = lake.getAllStructureDefinitions();
      const noDupResultsCSs = lake.getAllCodeSystems();
      const noDupResultsVSs = lake.getAllValueSets();
      const noDupResults = [...noDupResultsSDs, ...noDupResultsCSs, ...noDupResultsVSs];

      // None have been removed as duplicate and no id is added
      expect(noDupResults).toHaveLength(4);
      expect(noDupResults[0].content.id).toBeUndefined();
      expect(noDupResults[1].content.id).toBeUndefined();
      expect(noDupResults[2].content.id).toBeUndefined();
      expect(noDupResults[3].content.id).toBeUndefined();

      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(0);
    });

    it('should log a warning and set a missing id on CodeSystem and ValueSet definitions that will be treated as instances', () => {
      lake = new LakeOfFHIR(
        getWildFHIRs('unsupported-codesystem.json', 'unsupported-valueset-missing-id.json')
      );

      const resultsCSs = lake.getAllCodeSystems();
      const resultsVSs = lake.getAllValueSets();
      const results = [...resultsCSs, ...resultsVSs];
      expect(results).toHaveLength(2);
      expect(results[0].content.id).toBeUndefined();
      expect(results[1].content.id).toBeUndefined();

      lake.assignMissingIds();
      lake.removeDuplicateDefinitions(); // Run to ensure we no longer remove these as duplicates
      const noDupResultsCSs = lake.getAllCodeSystems();
      const noDupResultsVSs = lake.getAllValueSets();
      const noDupResults = [...noDupResultsCSs, ...noDupResultsVSs];

      // None have been removed as duplicate and no id is added
      expect(noDupResults).toHaveLength(2);
      expect(noDupResults[0].content.id).toBe('GOFSH-GENERATED-ID-0');
      expect(noDupResults[1].content.id).toBe('UnsupportedValueSet');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Encountered 2 definition\(s\) that were missing an id/
      );
    });

    it('should log a warning for setting an id and log an error if it sets to a duplicate id', () => {
      lake = new LakeOfFHIR(
        getWildFHIRs(
          'simple-message-definition-missing-id.json',
          'simple-message-definition-missing-id.json',
          'simple-capability-statement-missing-id.json'
        )
      );

      const results = lake.getAllInstances();
      expect(results).toHaveLength(3);
      expect(results[0].content.id).toBeUndefined();
      expect(results[1].content.id).toBeUndefined();
      expect(results[2].content.id).toBeUndefined();

      lake.assignMissingIds();
      lake.removeDuplicateDefinitions(); // Run to ensure we only remove true duplicates
      const noDupResults = lake.getAllInstances();
      expect(noDupResults).toHaveLength(2);
      expect(noDupResults[0].content.id).toBe('Example-Message-Definition');
      expect(noDupResults[1].content.id).toBe('Base-FHIR-Capability-Statement');

      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Encountered 3 definition\(s\) that were missing an id/
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Encountered 1 definition\(s\) with the same resourceType and id as a previous definition./
      );
    });

    it('should not create an id that matches an existing id', () => {
      lake = new LakeOfFHIR(
        getWildFHIRs('patient-with-generated-id0.json', 'patient-missing-id.json')
      );

      const results = lake.getAllInstances();
      expect(results).toHaveLength(2);
      expect(results[0].content.id).toBe('GOFSH-GENERATED-ID-0');
      expect(results[1].content.id).toBeUndefined();

      lake.assignMissingIds();
      lake.removeDuplicateDefinitions(); // Run to ensure we don't remove these as duplicates
      const noDupResults = lake.getAllInstances();
      expect(noDupResults).toHaveLength(2);
      expect(noDupResults[0].content.id).toBe('GOFSH-GENERATED-ID-0');
      expect(noDupResults[1].content.id).toBe('GOFSH-GENERATED-ID-1');

      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Encountered 1 definition\(s\) that were missing an id/
      );
    });
  });
});

function getWildFHIRs(...files: string[]): WildFHIR[] {
  return files.map(f => {
    const fPath = path.join(__dirname, 'fixtures', f);
    return new WildFHIR({ content: fs.readJSONSync(fPath) }, fPath);
  });
}
