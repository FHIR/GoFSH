import { utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { MasterFisher } from '../../utils';
import { resolveURL } from '../utils';
import {
  ExportableValueSetConceptComponentRule,
  ExportableValueSetFilterComponentRule
} from '../../exportable';

export default {
  name: 'resolve_value_set_component_rule_urls',
  description:
    'Replace URLs in value set rules with their names (for local and FHIR Core URLs only)',

  optimize(pkg: Package, fisher: MasterFisher): void {
    pkg.valueSets.forEach(vs => {
      vs.rules.forEach(rule => {
        if (
          rule instanceof ExportableValueSetConceptComponentRule ||
          rule instanceof ExportableValueSetFilterComponentRule
        ) {
          if (rule.from.system) {
            rule.from.system = resolveURL(rule.from.system, [utils.Type.CodeSystem], fisher);
          }
          if (rule.from.valueSets) {
            rule.from.valueSets = rule.from.valueSets.map(vsURL => {
              return resolveURL(vsURL, [utils.Type.ValueSet], fisher);
            });
          }
          if (rule instanceof ExportableValueSetConceptComponentRule) {
            rule.concepts.forEach(concept => {
              if (concept.system) {
                concept.system = resolveURL(concept.system, [utils.Type.CodeSystem], fisher);
              }
            });
          }
        }
      });
    });
  }
} as OptimizerPlugin;
