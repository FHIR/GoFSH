import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';

export default {
  name: 'simplify_mapping_names',
  description:
    'Simplify Mapping names by removing the appended source information from the name (where possible)',

  optimize(pkg: Package): void {
    pkg.mappings.forEach((mapping, index) => {
      // If the mapping does not have the same id as any other mapping, it is safe to
      // use the id as the name and remove the source information from the name
      if (!pkg.mappings.find((m, i) => m.id === mapping.id && i !== index)) {
        mapping.name = mapping.id;
      }
    });
  }
} as OptimizerPlugin;
