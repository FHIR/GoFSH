import { utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { optimizeURL } from '../utils';
import { Package } from '../../processor';
import { MasterFisher, ProcessingOptions } from '../../utils';
import { ExportableCaretValueRule } from '../../exportable';

export default {
  name: 'resolve_value_set_caret_rule_urls',
  description: 'Replace URLs in value set caret rules with their names or aliases',
  runAfter: ['resolve_value_set_component_rule_urls'],
  optimize(pkg: Package, fisher: MasterFisher, options: ProcessingOptions = {}): void {
    pkg.valueSets.forEach(vs => {
      vs.rules.forEach(rule => {
        if (rule instanceof ExportableCaretValueRule && rule.pathArray.length > 0) {
          const [system, ...code] = rule.pathArray[0].split('#');
          const resolvedSystem = optimizeURL(
            system,
            pkg.aliases,
            [utils.Type.CodeSystem],
            fisher,
            options.alias ?? true
          );
          rule.pathArray[0] = [resolvedSystem, code.join('#')].join('#');
        }
      });
    });
  }
} as OptimizerPlugin;
