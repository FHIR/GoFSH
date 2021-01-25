import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import ResolveInstanceOfURLsOptimizer from './ResolveInstanceOfURLsOptimizer';

export default {
  name: 'simplify_instance_names',
  description:
    'Simplify Instance names by removing the appended InstanceOf information from the name (where possible)',
  runAfter: [ResolveInstanceOfURLsOptimizer.name],

  optimize(pkg: Package): void {
    pkg.instances
      .filter(i => i.usage !== 'Inline')
      .forEach((instance, index) => {
        if (pkg.instances.find((m, i) => m.id === instance.id && i !== index)) {
          // If the instance has the same id as any other instance, it must use
          // the InstanceOf information in its name
          instance.name = `${instance.id}-for-${instance.instanceOf}`;
        }
      });
  }
} as OptimizerPlugin;
