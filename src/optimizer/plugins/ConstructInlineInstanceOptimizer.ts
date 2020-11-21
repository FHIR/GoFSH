import { pullAt, escapeRegExp } from 'lodash';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableAssignmentRule, ExportableInstance } from '../../exportable';

export default {
  name: 'construct_inline_instance',
  description:
    'Construct inline instances from groups of rules in a contained resource or a Bundle',

  optimize(pkg: Package): void {
    const inlineInstances: ExportableInstance[] = [];
    [...pkg.instances].forEach(instance => {
      // First get all possible paths for which child elements should be extracted onto an inline instance
      const basePaths = instance.rules
        .filter(
          rule =>
            rule instanceof ExportableAssignmentRule &&
            (/^contained(\[\d+\])?\.resourceType$/.test(rule.path) ||
              /^entry(\[\d+\])?\.resource\.resourceType$/.test(rule.path))
        )
        .map(rule => rule.path.replace('.resourceType', ''));

      let generatedIdCount = 0;
      // For each base path, extract an inline instance
      basePaths.forEach(basePath => {
        const rulesToRemove: number[] = [];
        let id: string;
        let resourceType: string;
        let profile: string;
        const newInstance = new ExportableInstance('');

        // Find all rules on the instance that are children of the base path and should be
        // added to the inline instance
        instance.rules.forEach((rule, i) => {
          if (!(rule instanceof ExportableAssignmentRule && rule.path.startsWith(basePath))) {
            return;
          }

          rulesToRemove.push(i);
          // id and resourceType and meta.profile should be used for keywords, all other rules are added
          if (rule.path === `${basePath}.id`) {
            id = rule.value as string;
          } else if (rule.path === `${basePath}.resourceType`) {
            resourceType = rule.value as string;
          } else if (
            new RegExp(`${escapeRegExp(basePath)}\\.meta\\.profile(\\[0\\])?`).test(rule.path)
          ) {
            profile = rule.value as string;
          } else {
            newInstance.rules.push(rule);
          }
        });

        newInstance.id = id ?? `Inline-Instance-for-${instance.id}-${(generatedIdCount += 1)}`;
        newInstance.instanceOf = profile ?? resourceType;
        newInstance.usage = 'Inline';
        inlineInstances.push(newInstance);

        pullAt(instance.rules, rulesToRemove);
        const inlineInstanceRule = new ExportableAssignmentRule(basePath);
        inlineInstanceRule.isInstance = true;
        inlineInstanceRule.value = newInstance.id;
        instance.rules.push(inlineInstanceRule);
      });
    });
    pkg.instances.push(...inlineInstances);
  }
} as OptimizerPlugin;
