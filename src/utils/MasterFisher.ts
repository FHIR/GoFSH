import { utils, fhirtypes } from 'fsh-sushi';
import { LakeOfFHIR } from '../processor';
import { FHIRDefinitions } from '../utils';

/**
 * The MasterFisher can fish from the LakeOfFHIR and external definitions. When the MasterFisher fishes,
 * it fishes in the LakeOfFHIR first and then the external definitions.  This essentially prefers local
 * definitions first (when there are naming clashes) - matching the SUSHI MasterFisher behavior.
 */
export class MasterFisher implements utils.Fishable {
  constructor(
    public lakeOfFHIR: LakeOfFHIR,
    public external?: FHIRDefinitions
  ) {}

  fishForStructureDefinition(item: string) {
    const json = this.fishForFHIR(
      item,
      utils.Type.Resource,
      utils.Type.Profile,
      utils.Type.Extension,
      utils.Type.Type
    );
    if (json) {
      // It is possible we can't parse the json, most likely if it doesn't have a snapshot
      // if that is the case we don't want actual errors, just return nothing
      try {
        return fhirtypes.StructureDefinition.fromJSON(json);
      } catch {}
    }
  }

  fishForFHIR(item: string, ...types: utils.Type[]) {
    return (
      this.lakeOfFHIR.fishForFHIR(item, ...types) ?? this.external?.fishForFHIR(item, ...types)
    );
  }

  fishForMetadata(item: string, ...types: utils.Type[]): utils.Metadata {
    return (
      this.lakeOfFHIR.fishForMetadata(item, ...types) ??
      this.external?.fishForMetadata(item, ...types)
    );
  }
}
