import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package, FHIRProcessor } from '../../processor';

const FHIR_BASE_URL = /http:\/\/hl7\.org\/fhir\/StructureDefinition\/(.+)/;

export default {
  name: 'resolve_parent_urls',
  description: 'Replace declared parent URLs with their names (for local and FHIR Core URLs only)',

  optimize(pkg: Package, processor: FHIRProcessor): void {
    for (const resource of [...pkg.profiles, ...pkg.extensions]) {
      if (resource.parent) {
        // The parent might be another SD in the processor or a core FHIR resource
        const parentSd = Array.from(processor.structureDefinitions.values()).find(
          (sd: any) => sd.url === resource.parent
        );
        if (parentSd?.name) {
          resource.parent = parentSd.name;
        } else {
          const fhirMatch = resource.parent.match(FHIR_BASE_URL);
          // Only change the FHIR url into a name if it won't collide with a local SD
          if (
            fhirMatch?.[1] &&
            !Array.from(processor.structureDefinitions.values()).some(
              sd => sd.name === fhirMatch[1]
            )
          ) {
            resource.parent = fhirMatch[1];
          }
        }
      }
    }
  }
} as OptimizerPlugin;
