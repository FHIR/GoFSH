import { utils } from 'fsh-sushi';
import { MasterFisher } from '../../src/utils';

const RESOURCE_A_FHIR = { resourceType: 'TypeA', id: 'resource-a', name: 'ResourceA' };
const RESOURCE_A_METADATA = { id: 'resource-a', name: 'ResourceA' };
const RESOURCE_B_FHIR = { resourceType: 'TypeB', id: 'resource-b', name: 'ResourceB' };
const RESOURCE_B_METADATA = { id: 'resource-b', name: 'ResourceB' };

describe('MasterFisher', () => {
  let fisherA: utils.Fishable;
  let fisherB: utils.Fishable;

  beforeAll(() => {
    fisherA = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      fishForFHIR: (item: string, ...types: utils.Type[]) => {
        return RESOURCE_A_FHIR;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      fishForMetadata: (item: string, ...types: utils.Type[]): utils.Metadata => {
        return RESOURCE_A_METADATA;
      }
    };
    fisherB = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      fishForFHIR: (item: string, ...types: utils.Type[]) => {
        return RESOURCE_B_FHIR;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      fishForMetadata: (item: string, ...types: utils.Type[]): utils.Metadata => {
        return RESOURCE_B_METADATA;
      }
    };
  });

  describe('#fishForFHIR', () => {
    let fisherAfishForFHIRSpy: jest.SpyInstance;
    let fisherBfishForFHIRSpy: jest.SpyInstance;

    beforeEach(() => {
      fisherAfishForFHIRSpy = jest.spyOn(fisherA, 'fishForFHIR');
      fisherBfishForFHIRSpy = jest.spyOn(fisherB, 'fishForFHIR');
    });

    afterEach(() => jest.clearAllMocks());

    it('should process fishers in order, returning the first positive hit', () => {
      // First, A B
      let fisher = new MasterFisher(fisherA, fisherB);
      expect(fisher.fishForFHIR('Foo', utils.Type.Resource)).toEqual(RESOURCE_A_FHIR);
      expect(fisherAfishForFHIRSpy).toHaveBeenCalledWith('Foo', utils.Type.Resource);
      expect(fisherBfishForFHIRSpy).not.toHaveBeenCalled();
      // Then, B A, just to be sure
      jest.clearAllMocks();
      fisher = new MasterFisher(fisherB, fisherA);
      expect(fisher.fishForFHIR('Foo', utils.Type.Resource)).toEqual(RESOURCE_B_FHIR);
      expect(fisherBfishForFHIRSpy).toHaveBeenCalledWith('Foo', utils.Type.Resource);
      expect(fisherAfishForFHIRSpy).not.toHaveBeenCalled();
    });

    it('should use the second fisher if the first fisher does not get a hit', () => {
      const fisher = new MasterFisher(fisherA, fisherB);
      fisherAfishForFHIRSpy.mockReturnValue(undefined);
      expect(fisher.fishForFHIR('Foo', utils.Type.Resource)).toEqual(RESOURCE_B_FHIR);
      expect(fisherAfishForFHIRSpy).toHaveBeenCalledWith('Foo', utils.Type.Resource);
      expect(fisherBfishForFHIRSpy).toHaveBeenCalledWith('Foo', utils.Type.Resource);
    });

    it('should return undefined if no fisher gets a hit', () => {
      const fisher = new MasterFisher(fisherA, fisherB);
      fisherAfishForFHIRSpy.mockReturnValue(undefined);
      fisherBfishForFHIRSpy.mockReturnValue(undefined);
      expect(fisher.fishForFHIR('Foo', utils.Type.Resource)).toBeUndefined();
      expect(fisherAfishForFHIRSpy).toHaveBeenCalledWith('Foo', utils.Type.Resource);
      expect(fisherBfishForFHIRSpy).toHaveBeenCalledWith('Foo', utils.Type.Resource);
    });

    it('should return undefined if there are no fishers', () => {
      const fisher = new MasterFisher();
      expect(fisher.fishForFHIR('Foo', utils.Type.Resource)).toBeUndefined();
    });
  });

  describe('#fishForMetadata', () => {
    let fisherAfishForMetadataSpy: jest.SpyInstance;
    let fisherBfishForMetadataSpy: jest.SpyInstance;

    beforeEach(() => {
      fisherAfishForMetadataSpy = jest.spyOn(fisherA, 'fishForMetadata');
      fisherBfishForMetadataSpy = jest.spyOn(fisherB, 'fishForMetadata');
    });

    afterEach(() => jest.clearAllMocks());

    it('should process fishers in order, returning the first positive hit', () => {
      // First, A B
      let fisher = new MasterFisher(fisherA, fisherB);
      expect(fisher.fishForMetadata('Foo', utils.Type.Resource)).toEqual(RESOURCE_A_METADATA);
      expect(fisherAfishForMetadataSpy).toHaveBeenCalledWith('Foo', utils.Type.Resource);
      expect(fisherBfishForMetadataSpy).not.toHaveBeenCalled();
      // Then, B A, just to be sure
      jest.clearAllMocks();
      fisher = new MasterFisher(fisherB, fisherA);
      expect(fisher.fishForMetadata('Foo', utils.Type.Resource)).toEqual(RESOURCE_B_METADATA);
      expect(fisherBfishForMetadataSpy).toHaveBeenCalledWith('Foo', utils.Type.Resource);
      expect(fisherAfishForMetadataSpy).not.toHaveBeenCalled();
    });

    it('should use the second fisher if the first fisher does not get a hit', () => {
      const fisher = new MasterFisher(fisherA, fisherB);
      fisherAfishForMetadataSpy.mockReturnValue(undefined);
      expect(fisher.fishForMetadata('Foo', utils.Type.Resource)).toEqual(RESOURCE_B_METADATA);
      expect(fisherAfishForMetadataSpy).toHaveBeenCalledWith('Foo', utils.Type.Resource);
      expect(fisherBfishForMetadataSpy).toHaveBeenCalledWith('Foo', utils.Type.Resource);
    });

    it('should return undefined if no fisher gets a hit', () => {
      const fisher = new MasterFisher(fisherA, fisherB);
      fisherAfishForMetadataSpy.mockReturnValue(undefined);
      fisherBfishForMetadataSpy.mockReturnValue(undefined);
      expect(fisher.fishForMetadata('Foo', utils.Type.Resource)).toBeUndefined();
      expect(fisherAfishForMetadataSpy).toHaveBeenCalledWith('Foo', utils.Type.Resource);
      expect(fisherBfishForMetadataSpy).toHaveBeenCalledWith('Foo', utils.Type.Resource);
    });

    it('should return undefined if there are no fishers', () => {
      const fisher = new MasterFisher();
      expect(fisher.fishForMetadata('Foo', utils.Type.Resource)).toBeUndefined();
    });
  });
});
