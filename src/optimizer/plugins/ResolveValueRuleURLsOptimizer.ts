import { fshtypes, utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableRule
} from '../../exportable';
import { optimizeURL } from '../utils';
import CombineCodingAndQuantityValuesOptimizer from './CombineCodingAndQuantityValuesOptimizer';
import { ProcessingOptions, MasterFisher } from '../../utils';

export default {
  name: 'resolve_value_rule_urls',
  description: 'Replace URLs in caret and assignment rules with their names or aliases',
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
          rule.value.system = optimizeURL(
            rule.value.system,
            pkg.aliases,
            [utils.Type.CodeSystem],
            fisher,
            options.alias ?? true
          );
        }
      });
    });
  }
} as OptimizerPlugin;
