import { utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { resolveURL } from '../utils';

const FISHER_TYPES = [
  utils.Type.Resource,
  utils.Type.Type,
  utils.Type.Profile,
  utils.Type.Extension
];

export default {
  name: 'resolve_parent_urls',
  description: 'Replace declared parent URLs with their names (for local and FHIR Core URLs only)',

  optimize(pkg: Package, fisher: utils.Fishable): void {
    for (const resource of [...pkg.profiles, ...pkg.extensions]) {
      if (resource.parent) {
        resource.parent = resolveURL(resource.parent, FISHER_TYPES, fisher);
      }
    }
  }
} as OptimizerPlugin;
