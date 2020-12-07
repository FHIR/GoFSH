import { utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { MasterFisher } from '../../utils';
import { optimizeURL } from '../utils';

const FISHER_TYPES = [
  utils.Type.Resource,
  utils.Type.Type,
  utils.Type.Profile,
  utils.Type.Extension
];

export default {
  name: 'resolve_instanceof_urls',
  description: 'Replace declared instanceOf URLs with their names or aliases',

  optimize(pkg: Package, fisher: MasterFisher): void {
    pkg.instances.forEach(instance => {
      if (instance.instanceOf) {
        instance.instanceOf = optimizeURL(instance.instanceOf, pkg.aliases, FISHER_TYPES, fisher);
      }
    });
  }
} as OptimizerPlugin;
