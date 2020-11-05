import { utils, fshrules } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';

export default {
  name: 'resolve_value_set_component_rule_urls',
  description:
    'Replace URLs in value set rules with their names (for local and FHIR Core URLs only)',

  optimize(pkg: Package, fisher: utils.Fishable): void {
    [...pkg.valueSets].forEach(vs => {
      vs.rules.forEach(rule => {
        if (rule instanceof fshrules.ValueSetComponentRule) {
          if (rule.from.system) {
            const systemDef = fisher.fishForFHIR(rule.from.system, utils.Type.CodeSystem);
            // Only substitute the name if the name resolves to the same CodeSystem by default (in case of duplicate names)
            if (
              systemDef?.name &&
              fisher.fishForFHIR(systemDef.name, utils.Type.CodeSystem).url === rule.from.system
            ) {
              rule.from.system = systemDef.name;
            }
          }
          if (rule.from.valueSets) {
            rule.from.valueSets = rule.from.valueSets.map(fromVS => {
              const vsDef = fisher.fishForFHIR(fromVS, utils.Type.ValueSet);
              // Only substitute the name if the name resolves to the same ValueSet by default (in case of duplicate names)
              if (
                vsDef?.name &&
                fisher.fishForFHIR(vsDef.name, utils.Type.ValueSet).url === fromVS
              ) {
                return vsDef.name;
              }
              return fromVS;
            });
          }
        }
      });
    });
  }
} as OptimizerPlugin;
