import { utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableBindingRule } from '../../exportable';
import { MasterFisher, ProcessingOptions } from '../../utils';
import { optimizeURL } from '../utils';

export default {
  name: 'resolve_binding_rule_urls',
  description: 'Replace URLs in binding rules with their names or aliases',

  optimize(pkg: Package, fisher: MasterFisher, options: ProcessingOptions = {}): void {
    [...pkg.profiles, ...pkg.extensions].forEach(resource => {
      resource.rules.forEach(rule => {
        if (rule instanceof ExportableBindingRule) {
          rule.valueSet = optimizeURL(
            rule.valueSet,
            pkg.aliases,
            [utils.Type.ValueSet],
            fisher,
            options.alias ?? true
          );
        }
      });
    });
  }
} as OptimizerPlugin;
