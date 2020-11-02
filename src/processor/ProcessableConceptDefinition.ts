import { fhirtypes } from 'fsh-sushi';

export type ProcessableConceptDefinition = fhirtypes.CodeSystemConcept & {
  processedPaths: string[];
};
