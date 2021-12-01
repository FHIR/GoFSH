import { fshtypes } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableRule
} from '../../exportable';
import { resolveAliasFromURL } from '../utils';
import CombineCodingAndQuantityValuesOptimizer from './CombineCodingAndQuantityValuesOptimizer';
import { ProcessingOptions } from '../../utils';

export default {
  name: 'resolve_value_rule_urls',
  description: 'Replace URLs in caret and assignment rules with their names or aliases',
  runAfter: [CombineCodingAndQuantityValuesOptimizer.name],

  optimize(pkg: Package): void {
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
          rule.value.system =
            resolveAliasFromURL(rule.value.system, pkg.aliases) ?? rule.value.system;
        }
      });
    });
  },
  isEnabled(options: ProcessingOptions): boolean {
    return options.alias === true;
  }
} as OptimizerPlugin;
