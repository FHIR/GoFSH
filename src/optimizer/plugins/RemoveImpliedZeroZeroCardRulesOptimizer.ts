import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableCardRule } from '../../exportable';
import { pullAt } from 'lodash';

// If an extension has meaningful value[x] rules, SUSHI will constrain extension to 0..0.
// If an extension adds sub-extensions, SUSHI will constrain value[x] to 0..0.
// GoFSH does not need to output these 0..0 rules since SUSHI will automatically add them.
// This goes for top-value paths in extensions as well as all sub-extensions.
export default {
  name: 'remove_implied_zero_zero_card_rules',
  description:
    'Remove value[x]/extension 0..0 rules that SUSHI automatically applies in Extension definitions',

  optimize(pkg: Package): void {
    pkg.extensions.forEach(sd => {
      const rulesToRemove: number[] = [];
      sd.rules.forEach((r, i) => {
        if (
          // r is a 0..0 card rule, AND
          r instanceof ExportableCardRule &&
          r.max === '0' &&
          //r is an extension path and there exist sibling value paths that are not 0..0, OR
          ((r.path.endsWith('extension') &&
            sd.rules.some(
              r2 =>
                r2.path.startsWith(r.path.replace(/extension$/, 'value')) &&
                !(r2 instanceof ExportableCardRule && r2.max === '0')
            )) ||
            // r is a value[x] path and there exist sibling extension paths that are not 0..0
            (r.path.endsWith('value[x]') &&
              sd.rules.some(
                r2 =>
                  r2.path.startsWith(r.path.replace(/value\[x]$/, 'extension')) &&
                  !(r2 instanceof ExportableCardRule && r2.max === '0')
              )))
        ) {
          rulesToRemove.push(i);
        }
      });
      pullAt(sd.rules, rulesToRemove);
    });
  }
} as OptimizerPlugin;
