import { utils } from 'fsh-sushi';

export class MasterFisher implements utils.Fishable {
  private fishables: utils.Fishable[];

  constructor(...fishables: utils.Fishable[]) {
    this.fishables = fishables ?? [];
  }

  fishForFHIR(item: string, ...types: utils.Type[]) {
    for (const fishable of this.fishables) {
      const result = fishable.fishForFHIR(item, ...types);
      if (result) {
        return result;
      }
    }
  }

  fishForMetadata(item: string, ...types: utils.Type[]): utils.Metadata {
    for (const fishable of this.fishables) {
      const result = fishable.fishForMetadata(item, ...types);
      if (result) {
        return result;
      }
    }
  }
}
