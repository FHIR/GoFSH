import { utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableOnlyRule } from '../../exportable';

const FISHER_TYPES = [
  utils.Type.Resource,
  utils.Type.Type,
  utils.Type.Profile,
  utils.Type.Extension
];

export default {
  name: 'resolve_only_rule_urls',
  description: 'Replace URLs in "only" rules with their names (for local and FHIR Core URLs only)',

  optimize(pkg: Package, fisher: utils.Fishable): void {
    [...pkg.profiles, ...pkg.extensions].forEach(sd => {
      sd.rules.forEach(rule => {
        if (rule instanceof ExportableOnlyRule) {
          rule.types.forEach(onlyRuleType => {
            // Only substitute the name if the name resolves to the same resource by default (in case of duplicate names)
            const typeSd = fisher.fishForFHIR(onlyRuleType.type, ...FISHER_TYPES);
            if (
              typeSd?.name &&
              fisher.fishForFHIR(typeSd.name, ...FISHER_TYPES).url === onlyRuleType.type
            ) {
              onlyRuleType.type = typeSd.name;
            }
          });
        }
      });
    });
  }
} as OptimizerPlugin;
