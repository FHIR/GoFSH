import { utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { optimizeURL } from '../utils';
import {
  ExportableValueSetConceptComponentRule,
  ExportableValueSetFilterComponentRule
} from '../../exportable';

export default {
  name: 'resolve_value_set_component_rule_urls',
  description: 'Replace URLs in value set rules with their names or aliases',

  optimize(pkg: Package, fisher: utils.Fishable): void {
    pkg.valueSets.forEach(vs => {
      vs.rules.forEach(rule => {
        if (
          rule instanceof ExportableValueSetConceptComponentRule ||
          rule instanceof ExportableValueSetFilterComponentRule
        ) {
          if (rule.from.system) {
            rule.from.system = optimizeURL(
              rule.from.system,
              pkg.aliases,
              [utils.Type.CodeSystem],
              fisher
            );
          }
          if (rule.from.valueSets) {
            rule.from.valueSets = rule.from.valueSets.map(vsURL => {
              return optimizeURL(vsURL, pkg.aliases, [utils.Type.ValueSet], fisher);
            });
          }
          if (rule instanceof ExportableValueSetConceptComponentRule) {
            rule.concepts.forEach(concept => {
              if (concept.system) {
                concept.system = optimizeURL(
                  concept.system,
                  pkg.aliases,
                  [utils.Type.CodeSystem],
                  fisher
                );
              }
            });
          }
        }
      });
    });
  }
} as OptimizerPlugin;
