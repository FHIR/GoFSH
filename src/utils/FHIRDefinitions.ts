import { FHIRDefinitions as BaseFHIRDefinitions, Type } from 'fhir-package-loader';
import { utils } from 'fsh-sushi';

export class FHIRDefinitions extends BaseFHIRDefinitions implements utils.Fishable {
  fishForMetadata(item: string, ...types: Type[]): utils.Metadata | undefined {
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
