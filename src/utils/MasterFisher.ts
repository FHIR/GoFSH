import { utils, fhirdefs } from 'fsh-sushi';
import { LakeOfFHIR } from '../processor';

/**
 * The MasterFisher can fish from the LakeOfFHIR and external definitions. When the MasterFisher fishes,
 * it fishes in the LakeOfFHIR first and then the external definitions.  This essentially prefers local
 * definitions first (when there are naming clashes) - matching the SUSHI MasterFisher behavior.
 */
export class MasterFisher implements utils.Fishable {
  constructor(
    public lakeOfFHIR = new LakeOfFHIR([]),
    public external = new fhirdefs.FHIRDefinitions()
  ) {}

  fishForFHIR(item: string, ...types: utils.Type[]) {
    return this.lakeOfFHIR.fishForFHIR(item, ...types) ?? this.external.fishForFHIR(item, ...types);
  }

  fishForMetadata(item: string, ...types: utils.Type[]): utils.Metadata {
    return (
      this.lakeOfFHIR.fishForMetadata(item, ...types) ??
      this.external.fishForMetadata(item, ...types)
    );
  }
}
