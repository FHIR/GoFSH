import { utils, fhirdefs } from 'fsh-sushi';

export class FHIRDefinitions extends fhirdefs.FHIRDefinitions implements utils.Fishable {
  fishForMetadata(item: string, ...types: utils.Type[]): utils.Metadata | undefined {
    const result = this.fishForFHIR(item, ...types);
    if (result) {
      return {
        id: result.id as string,
        name: result.name as string,
        url: result.url as string
      };
    }
  }
}
