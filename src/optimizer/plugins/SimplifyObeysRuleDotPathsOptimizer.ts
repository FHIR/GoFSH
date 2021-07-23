import { Package } from '../../processor';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { ExportableObeysRule } from '../../exportable';

export default {
  name: 'simplify_obeys_rule_dot_paths',
  description: 'Simplify obeys rules by changing dot paths to empty paths.',
  optimize(pkg: Package): void {
    [...pkg.profiles, ...pkg.extensions, ...pkg.logicals, ...pkg.resources].forEach(entity => {
      entity.rules.forEach(rule => {
        if (rule instanceof ExportableObeysRule && rule.path === '.') {
          rule.path = '';
        }
      });
    });
  }
} as OptimizerPlugin;
