import { fhirtypes } from 'fsh-sushi';

export class ProcessableElementDefinition extends fhirtypes.ElementDefinition {
  processedPaths: string[];

  static fromJSON(json: any, captureOriginal = true): ProcessableElementDefinition {
    // TODO: Update this once SUSHI exports support for the initialized instance in fromJSON
    // const ed = super.fromJSON(json, captureOriginal, new ProcessableElementDefinition()) as ProcessableElementDefinition;
    const ed = super.fromJSON(json, captureOriginal) as ProcessableElementDefinition;
    ed.processedPaths = [];
    return ed;
  }
}
