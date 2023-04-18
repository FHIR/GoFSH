import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableAssignmentRule, ExportableCaretValueRule } from '../../exportable';
import ResolveInstanceOfURLsOptimizer from './ResolveInstanceOfURLsOptimizer';

export default {
  name: 'simplify_instance_names',
  description:
    'Simplify Instance names by removing the appended InstanceOf information from the name (where possible)',
  runAfter: [ResolveInstanceOfURLsOptimizer.name],

  optimize(pkg: Package): void {
    const oldNameToNewNameMap = new Map<string, string>();
    const standaloneInstances = pkg.instances.filter(i => i.usage !== 'Inline');
    standaloneInstances.forEach((instance, index) => {
      // Only match on other standalones because inline instances already deduplicated the name based on id
      if (!standaloneInstances.find((m, i) => m.id === instance.id && i !== index)) {
        // If the instance does not have the same id as any other instance, it is safe to
        // use the id as the name and remove the InstanceOf information from the name
        oldNameToNewNameMap.set(instance.name, instance.id);
        instance.name = instance.id;
      } else if (!instance.name.endsWith(instance.instanceOf)) {
        // If the instance name isn't simplified, the InstanceOf information is present
        // If it does not end with the current InstanceOf, an alias was used, and we should use that
        oldNameToNewNameMap.set(instance.name, `${instance.id}-of-${instance.instanceOf}`);
        instance.name = `${instance.id}-of-${instance.instanceOf}`;
      }

      if (instance.id != null && instance.id !== instance.name) {
        // add a rule to set the id so it is not lost
        const idRule = new ExportableAssignmentRule('id');
        idRule.value = instance.id;
        instance.rules.unshift(idRule);
      }
    });

    // Fix up inline assignments in types that may have them (see: ConstructInlineInstanceOptimizer)
    [...pkg.instances, ...pkg.profiles, ...pkg.extensions].forEach(resource => {
      const inlineAssignmentRules = resource.rules.filter(
        rule =>
          (rule instanceof ExportableAssignmentRule || rule instanceof ExportableCaretValueRule) &&
          rule.isInstance
      );
      inlineAssignmentRules.forEach((rule: ExportableAssignmentRule | ExportableCaretValueRule) => {
        if (oldNameToNewNameMap.has(rule.value as string)) {
          rule.value = oldNameToNewNameMap.get(rule.value as string);
        }
      });
    });
  }
} as OptimizerPlugin;
