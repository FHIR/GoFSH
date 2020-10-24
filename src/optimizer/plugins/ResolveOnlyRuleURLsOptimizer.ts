import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package, FHIRProcessor } from '../../processor';
import { ExportableOnlyRule } from '../../exportable';

const FHIR_BASE_URL = /http:\/\/hl7\.org\/fhir\/StructureDefinition\/(.+)/;

export default {
  name: 'resolve_only_rule_urls',
  description: 'Replace URLs in "only" rules with their names (for local and FHIR Core URLs only)',

  optimize(pkg: Package, processor: FHIRProcessor): void {
    [...pkg.profiles, ...pkg.extensions].forEach(sd => {
      sd.rules.forEach(rule => {
        if (rule instanceof ExportableOnlyRule) {
          rule.types.forEach(onlyRuleType => {
            // The type might be another SD in the processor or a core FHIR resource
            const typeSd = processor.structureDefinitions.find(sd => sd.url === onlyRuleType.type);
            if (typeSd?.name) {
              onlyRuleType.type = typeSd.name;
            } else {
              const fhirMatch = onlyRuleType.type.match(FHIR_BASE_URL);
              // Only change the FHIR url into a name if it won't collide with a local SD
              if (
                fhirMatch?.[1] &&
                !processor.structureDefinitions.some(sd => sd.name === fhirMatch[1])
              ) {
                onlyRuleType.type = fhirMatch[1];
              }
            }
          });
        }
      });
    });
  }
} as OptimizerPlugin;
