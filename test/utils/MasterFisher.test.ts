import { utils } from 'fsh-sushi';
import { LakeOfFHIR } from '../../src/processor';
import { FHIRDefinitions, MasterFisher } from '../../src/utils';

const RESOURCE_A_FHIR = { resourceType: 'TypeA', id: 'resource-a', name: 'ResourceA' };
const RESOURCE_A_METADATA = { id: 'resource-a', name: 'ResourceA' };
const RESOURCE_B_FHIR = { resourceType: 'TypeB', id: 'resource-b', name: 'ResourceB' };
const RESOURCE_B_METADATA = { id: 'resource-b', name: 'ResourceB' };

describe('MasterFisher', () => {
  let lake: LakeOfFHIR;
  let fhir: FHIRDefinitions;
  let fisher: MasterFisher;

  beforeAll(() => {
    lake = new LakeOfFHIR([]);
    fhir = new FHIRDefinitions();
    fisher = new MasterFisher(lake, fhir);
  });

  describe('#fishForFHIR', () => {
    let lakeSpy: jest.SpyInstance;
    let fhirSpy: jest.SpyInstance;

    beforeEach(() => {
      lakeSpy = jest.spyOn(lake, 'fishForFHIR');
      fhirSpy = jest.spyOn(fhir, 'fishForFHIR');
    });

    afterEach(() => jest.clearAllMocks());

    it('should return match from LakeOfFHIR if it exists only in the lake', () => {
      lakeSpy.mockReturnValue(RESOURCE_A_FHIR);
      fhirSpy.mockReturnValue(undefined);
      expect(fisher.fishForFHIR('Foo', utils.Type.Resource)).toEqual(RESOURCE_A_FHIR);
    });

    it('should return match from FHIRDefinitions if it exists only in the FHIR defs', () => {
      lakeSpy.mockReturnValue(undefined);
      fhirSpy.mockReturnValue(RESOURCE_B_FHIR);
      expect(fisher.fishForFHIR('Foo', utils.Type.Resource)).toEqual(RESOURCE_B_FHIR);
    });

    it('should return match from LakeOfFHIR if it exists both in the lake and FHIR defs', () => {
      lakeSpy.mockReturnValue(RESOURCE_A_FHIR);
      fhirSpy.mockReturnValue(RESOURCE_B_FHIR);
      expect(fisher.fishForFHIR('Foo', utils.Type.Resource)).toEqual(RESOURCE_A_FHIR);
    });

    it('should return undefined if no fisher gets a hit', () => {
      lakeSpy.mockReturnValue(undefined);
      fhirSpy.mockReturnValue(undefined);
      expect(fisher.fishForFHIR('Foo', utils.Type.Resource)).toBeUndefined();
    });
  });

  describe('#fishForMetadata', () => {
    let lakeSpy: jest.SpyInstance;
    let fhirSpy: jest.SpyInstance;

    beforeEach(() => {
      lakeSpy = jest.spyOn(lake, 'fishForMetadata');
      fhirSpy = jest.spyOn(fhir, 'fishForMetadata');
    });

    afterEach(() => jest.clearAllMocks());

    it('should return match from LakeOfFHIR if it exists only in the lake', () => {
      lakeSpy.mockReturnValue(RESOURCE_A_METADATA);
      fhirSpy.mockReturnValue(undefined);
      expect(fisher.fishForMetadata('Foo', utils.Type.Resource)).toEqual(RESOURCE_A_METADATA);
    });

    it('should return match from FHIRDefinitions if it exists only in the FHIR defs', () => {
      lakeSpy.mockReturnValue(undefined);
      fhirSpy.mockReturnValue(RESOURCE_B_METADATA);
      expect(fisher.fishForMetadata('Foo', utils.Type.Resource)).toEqual(RESOURCE_B_METADATA);
    });

    it('should return match from LakeOfFHIR if it exists both in the lake and FHIR defs', () => {
      lakeSpy.mockReturnValue(RESOURCE_A_METADATA);
      fhirSpy.mockReturnValue(RESOURCE_B_METADATA);
      expect(fisher.fishForMetadata('Foo', utils.Type.Resource)).toEqual(RESOURCE_A_METADATA);
    });

    it('should return undefined if no fisher gets a hit', () => {
      lakeSpy.mockReturnValue(undefined);
      fhirSpy.mockReturnValue(undefined);
      expect(fisher.fishForMetadata('Foo', utils.Type.Resource)).toBeUndefined();
    });
  });

  describe('#fishForMetadatas', () => {
    let lakeSpy: jest.SpyInstance;
    let fhirSpy: jest.SpyInstance;

    beforeEach(() => {
      lakeSpy = jest.spyOn(lake, 'fishForMetadatas');
      fhirSpy = jest.spyOn(fhir, 'fishForMetadatas');
    });

    afterEach(() => jest.clearAllMocks());

    it('should return all matches from the lake and the FHIR defs', () => {
      lakeSpy.mockReturnValue([RESOURCE_A_METADATA]);
      fhirSpy.mockReturnValue([RESOURCE_B_METADATA]);
      expect(fisher.fishForMetadatas('Foo', utils.Type.Resource)).toEqual([
        RESOURCE_A_METADATA,
        RESOURCE_B_METADATA
      ]);
    });
  });

  describe('#lakeOfFHIR', () => {
    afterEach(() => jest.clearAllMocks());

    it('should support fishing for FHIR on the lake', () => {
      const spy = jest.spyOn(lake, 'fishForFHIR');
      spy.mockReturnValue(RESOURCE_A_FHIR);
      expect(fisher.lakeOfFHIR.fishForFHIR('Foo', utils.Type.Resource)).toEqual(RESOURCE_A_FHIR);
      expect(spy).toHaveBeenCalled();
    });

    it('should support fishing for metadata on the lake', () => {
      const spy = jest.spyOn(lake, 'fishForMetadata');
      spy.mockReturnValue(RESOURCE_A_METADATA);
      expect(fisher.lakeOfFHIR.fishForMetadata('Foo', utils.Type.Resource)).toEqual(
        RESOURCE_A_METADATA
      );
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#fhir', () => {
    afterEach(() => jest.clearAllMocks());

    it('should support fishing for FHIR on the FHIR Definitions', () => {
      const spy = jest.spyOn(fhir, 'fishForFHIR');
      spy.mockReturnValue(RESOURCE_A_FHIR);
      expect(fisher.external.fishForFHIR('Foo', utils.Type.Resource)).toEqual(RESOURCE_A_FHIR);
      expect(spy).toHaveBeenCalled();
    });

    it('should support fishing for metadata on the lake', () => {
      const spy = jest.spyOn(fhir, 'fishForMetadata');
      spy.mockReturnValue(RESOURCE_A_METADATA);
      expect(fisher.external.fishForMetadata('Foo', utils.Type.Resource)).toEqual(
        RESOURCE_A_METADATA
      );
      expect(spy).toHaveBeenCalled();
    });
  });
});
