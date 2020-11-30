import fs from 'fs-extra';
import path from 'path';
import { utils } from 'fsh-sushi';
import { LakeOfFHIR, WildFHIR } from '../../src/processor';

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
        'unsupported-valueset.json'
      )
    );
  });

  describe('#constructor', () => {
    it('should store all the passed in values', () => {
      expect(lake.docs).toHaveLength(7);
      expect(lake.docs[0].content.id).toBe('simple.profile');
      expect(lake.docs[1].content.id).toBe('simple.extension');
      expect(lake.docs[2].content.id).toBe('simple.codesystem');
      expect(lake.docs[3].content.id).toBe('simple.valueset');
      expect(lake.docs[4].content.id).toBe('simple.ig');
      expect(lake.docs[5].content.id).toBe('rocky.balboa');
      expect(lake.docs[6].content.id).toBe('unsupported.valueset');
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
    it('should get all code systems', () => {
      const results = lake.getAllCodeSystems();
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

    it('should also get unsupported value sets when includeUnsupportedValueSets is true', () => {
      const results = lake.getAllInstances(true);
      expect(results).toHaveLength(2);
      expect(results[0].content.id).toBe('rocky.balboa');
      expect(results[1].content.id).toBe('unsupported.valueset');
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
});

function getWildFHIRs(...files: string[]): WildFHIR[] {
  return files.map(f => {
    const fPath = path.join(__dirname, 'fixtures', f);
    return new WildFHIR(fs.readJSONSync(fPath), fPath);
  });
}
