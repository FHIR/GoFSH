import { utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableOnlyRule } from '../../exportable';
import { optimizeURL } from '../utils';

const FISHER_TYPES = [
  utils.Type.Resource,
  utils.Type.Type,
  utils.Type.Profile,
  utils.Type.Extension
];

export default {
  name: 'resolve_only_rule_urls',
  description: 'Replace URLs in "only" rules with their names or aliases',

  optimize(pkg: Package, fisher: utils.Fishable): void {
    [...pkg.profiles, ...pkg.extensions].forEach(sd => {
      sd.rules.forEach(rule => {
        if (rule instanceof ExportableOnlyRule) {
          rule.types.forEach(onlyRuleType => {
            onlyRuleType.type = optimizeURL(onlyRuleType.type, pkg.aliases, FISHER_TYPES, fisher);
          });
        }
      });
    });
  }
} as OptimizerPlugin;
