import { fshtypes, utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableRule
} from '../../exportable';
import { resolveAliasFromURL } from '../utils';
import CombineCodingAndQuantityValuesOptimizer from './CombineCodingAndQuantityValuesOptimizer';
import { ProcessingOptions, MasterFisher } from '../../utils';

export default {
  name: 'resolve_value_rule_system_urls_for_codes',
  description:
    'Replace system URLs in code values in caret and assignment rules with their names or aliases',
  runAfter: [CombineCodingAndQuantityValuesOptimizer.name],

  optimize(pkg: Package, fisher: MasterFisher, options: ProcessingOptions = {}): void {
    [
      ...pkg.instances,
      ...pkg.profiles,
      ...pkg.extensions,
      ...pkg.codeSystems,
      ...pkg.valueSets
    ].forEach(resource => {
      resource.rules.forEach((rule: ExportableRule) => {
        if (
          (rule instanceof ExportableAssignmentRule || rule instanceof ExportableCaretValueRule) &&
          rule.value instanceof fshtypes.FshCode
        ) {
          const localSystem = fisher.lakeOfFHIR.fishForFHIR(
            rule.value.system,
            utils.Type.CodeSystem
          );
          if (localSystem?.name) {
            rule.value.system = localSystem.name;
          } else if (options.alias ?? true) {
            rule.value.system = resolveAliasFromURL(rule.value.system, pkg.aliases);
          }
        }
      });
    });
  }
} as OptimizerPlugin;
