import { utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';

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
        // Only substitute the name if the name resolves to the same resource by default (in case of duplicate names)
        const parentSd = fisher.fishForFHIR(resource.parent, ...FISHER_TYPES);
        if (
          parentSd?.name &&
          fisher.fishForFHIR(parentSd.name, ...FISHER_TYPES).url === resource.parent
        ) {
          resource.parent = parentSd.name;
        }
      }
    }
  }
} as OptimizerPlugin;
