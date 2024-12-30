import { utils, fhirdefs } from 'fsh-sushi';
import { logMessage } from './GoFSHLogger';

export class FHIRDefinitions extends fhirdefs.FHIRDefinitions implements utils.Fishable {
  constructor() {
    super(undefined, undefined, { options: { log: logMessage } });
  }

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
