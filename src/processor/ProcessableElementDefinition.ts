import { fhirtypes } from 'fsh-sushi';

export class ProcessableElementDefinition extends fhirtypes.ElementDefinition {
  processedPaths: string[];

  static fromJSON(json: any, captureOriginal = true): ProcessableElementDefinition {
    const ed = super.fromJSON(json, captureOriginal) as ProcessableElementDefinition;
    ed.processedPaths = [];
    return ed;
  }
}
