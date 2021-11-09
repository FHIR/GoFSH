import { utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { optimizeURL } from '../utils';
import { Package } from '../../processor';
import { MasterFisher, ProcessingOptions } from '../../utils';

const FISHER_TYPES = [
  utils.Type.Resource,
  utils.Type.Type,
  utils.Type.Profile,
  utils.Type.Extension,
  utils.Type.Logical
];

export default {
  name: 'resolve_parent_urls',
  description: 'Replace declared parent URLs with their names or aliases',

  optimize(pkg: Package, fisher: MasterFisher, options: ProcessingOptions = {}): void {
    for (const resource of [
      ...pkg.profiles,
      ...pkg.extensions,
      ...pkg.logicals,
      ...pkg.resources
    ]) {
      if (resource.parent) {
        resource.parent = optimizeURL(
          resource.parent,
          pkg.aliases,
          FISHER_TYPES,
          fisher,
          options.alias ?? true
        );
      }
    }
  }
} as OptimizerPlugin;
