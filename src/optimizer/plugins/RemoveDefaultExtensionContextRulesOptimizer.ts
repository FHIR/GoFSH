import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { isEqual } from 'lodash';

export default {
  name: 'remove_default_extension_context_rules',
  description: 'Remove extension contexts matching the default context that SUSHI generates',

  optimize(pkg: Package): void {
    // Loop through extensions looking for the default context type (and removing it)
    pkg.extensions.forEach(sd => {
      if (
        sd.contexts?.length === 1 &&
        isEqual(sd.contexts[0], {
          value: 'Element',
          isQuoted: false
        })
      ) {
        sd.contexts = [];
      }
    });
  }
} as OptimizerPlugin;
