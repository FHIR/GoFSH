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
        if (!pkg.instances.find((m, i) => m.id === instance.id && i !== index)) {
          // If the instance does not have the same id as any other instance, it is safe to
          // use the id as the name and remove the InstanceOf information from the name
          instance.name = instance.id;
        } else if (!instance.name.endsWith(instance.instanceOf)) {
          // If the instance name isn't simplified, the InstanceOf information is present
          // If it does not end with the current InstanceOf, an alias was used, and we should use that
          instance.name = `${instance.id}-of-${instance.instanceOf}`;
        }
      });
  }
} as OptimizerPlugin;
