import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';

export default {
  name: 'deduplicate_mapping_names',
  description:
    'Deduplicate Mapping names by appending the mapping source to the name (where needed)',

  optimize(pkg: Package): void {
    pkg.mappings.forEach((mapping, index) => {
      // If the mapping has the same name as any other mapping, use the source to make the name unique
      if (pkg.mappings.find((m, i) => m.id === mapping.id && i !== index)) {
        mapping.name = `${mapping.name}-for-${mapping.source}`;
      }
    });
  }
} as OptimizerPlugin;
