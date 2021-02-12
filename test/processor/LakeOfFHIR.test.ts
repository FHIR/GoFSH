import fs from 'fs-extra';
import path from 'path';
import { utils } from 'fsh-sushi';
import { LakeOfFHIR, WildFHIR } from '../../src/processor';
import { loggerSpy } from '../helpers/loggerSpy';

describe('LakeOfHIR', () => {
  let lake: LakeOfFHIR;

  beforeAll(() => {
    lake = new LakeOfFHIR(
      getWildFHIRs(
        'simple-profile.json',
        'simple-extension.json',
        'simple-codesystem.json',
        'simple-valueset.json',
        'simple-ig.json',
        'rocky-balboa.json',
        'unsupported-valueset.json',
        'unsupported-codesystem.json'
      )
    );
  });

  beforeEach(() => {
    loggerSpy.reset();
  });

  describe('#constructor', () => {
    it('should store all the passed in values', () => {
      expect(lake.docs).toHaveLength(8);
      expect(lake.docs[0].content.id).toBe('simple.profile');
      expect(lake.docs[1].content.id).toBe('simple.extension');
      expect(lake.docs[2].content.id).toBe('simple.codesystem');
      expect(lake.docs[3].content.id).toBe('simple.valueset');
      expect(lake.docs[4].content.id).toBe('simple.ig');
      expect(lake.docs[5].content.id).toBe('rocky.balboa');
      expect(lake.docs[6].content.id).toBe('unsupported.valueset');
      expect(lake.docs[7].content.id).toBe('unsupported.codesystem');
    });
  });

  describe('#getAllStructureDefinitions', () => {
    it('should get all structure definitions', () => {
      const results = lake.getAllStructureDefinitions();
      expect(results).toHaveLength(2);
      expect(results[0].content.id).toBe('simple.profile');
      expect(results[1].content.id).toBe('simple.extension');
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
      expect(results[1].content.id).toBe('unsupported.codesystem');
    });

    it('should get all code systems when includeUnsupported is true', () => {
      const results = lake.getAllCodeSystems(true);
      expect(results).toHaveLength(2);
      expect(results[0].content.id).toBe('simple.codesystem');
      expect(results[1].content.id).toBe('unsupported.codesystem');
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
      expect(results[2].content.id).toBe('unsupported.codesystem');
    });
  });

  describe('#fishForFHIR', () => {
    it('should fish by name', () => {
      expect(lake.fishForFHIR('SimpleProfile').id).toBe('simple.profile');
      expect(lake.fishForFHIR('SimpleExtension').id).toBe('simple.extension');
      expect(lake.fishForFHIR('SimpleCodeSystem').id).toBe('simple.codesystem');
      expect(lake.fishForFHIR('SimpleValueSet').id).toBe('simple.valueset');
    });

    it('should fish by name and Type', () => {
      expect(lake.fishForFHIR('SimpleProfile', utils.Type.Profile).id).toBe('simple.profile');
      expect(lake.fishForFHIR('SimpleProfile', utils.Type.Extension)).toBeUndefined();
      expect(lake.fishForFHIR('SimpleExtension', utils.Type.Extension).id).toBe('simple.extension');
      expect(lake.fishForFHIR('SimpleExtension', utils.Type.Profile)).toBeUndefined();
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
    it('should log a warning and set a missing id based on name', () => {
      lake = new LakeOfFHIR(getWildFHIRs('big-profile.json', 'small-extension.json'));

      const results = lake.getAllStructureDefinitions();
      expect(results).toHaveLength(2);
      expect(results[0].content.id).toBeUndefined();
      expect(results[1].content.id).toBeUndefined();

      lake.assignMissingIds();
      lake.removeDuplicateDefinitions(); // Run to ensure we no longer remove these as duplicates
      const noDupResults = lake.getAllStructureDefinitions();
      expect(noDupResults).toHaveLength(2);
      expect(noDupResults[0].content.id).toBe('BigProfile');
      expect(noDupResults[1].content.id).toBe('SmallExtension');

      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Encountered 2 definition\(s\) that were missing an id/
      );
    });

    it('should log a warning and set a missing id based on a counter if no name if available', () => {
      lake = new LakeOfFHIR(getWildFHIRs('nameless-profile.json', 'nameless-extension.json'));

      const results = lake.getAllStructureDefinitions();
      expect(results).toHaveLength(2);
      expect(results[0].content.id).toBeUndefined();
      expect(results[1].content.id).toBeUndefined();

      lake.assignMissingIds();
      lake.removeDuplicateDefinitions(); // Run to ensure we no longer remove these as duplicates
      const noDupResults = lake.getAllStructureDefinitions();
      expect(noDupResults).toHaveLength(2);
      expect(noDupResults[0].content.id).toBe('id-0');
      expect(noDupResults[1].content.id).toBe('id-1');

      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Encountered 2 definition\(s\) that were missing an id/
      );
    });

    it('should log a warning for setting an id and log an error if it sets to a duplicate id', () => {
      lake = new LakeOfFHIR(
        getWildFHIRs('big-profile.json', 'big-profile.json', 'small-extension.json')
      );

      const results = lake.getAllStructureDefinitions();
      expect(results).toHaveLength(3);
      expect(results[0].content.id).toBeUndefined();
      expect(results[1].content.id).toBeUndefined();
      expect(results[2].content.id).toBeUndefined();

      lake.assignMissingIds();
      lake.removeDuplicateDefinitions(); // Run to ensure we no longer remove these as duplicates
      const noDupResults = lake.getAllStructureDefinitions();
      expect(noDupResults).toHaveLength(2);
      expect(noDupResults[0].content.id).toBe('BigProfile');
      expect(noDupResults[1].content.id).toBe('SmallExtension');

      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Encountered 3 definition\(s\) that were missing an id/
      );
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Encountered 1 definition\(s\) with the same resourceType and id as a previous definition./
      );
    });
  });
});

function getWildFHIRs(...files: string[]): WildFHIR[] {
  return files.map(f => {
    const fPath = path.join(__dirname, 'fixtures', f);
    return new WildFHIR(fs.readJSONSync(fPath), fPath);
  });
}
