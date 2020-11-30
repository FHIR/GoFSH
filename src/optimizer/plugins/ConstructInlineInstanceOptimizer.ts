import { pullAt, escapeRegExp, cloneDeep } from 'lodash';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableInstance,
  ExportableSdRule
} from '../../exportable';

export default {
  name: 'construct_inline_instance',
  description:
    'Construct inline instances from groups of rules in a contained resource or a Bundle',

  optimize(pkg: Package): void {
    const inlineInstances: ExportableInstance[] = [];
    [...pkg.instances, ...pkg.profiles, ...pkg.extensions].forEach(resource => {
      const ruleType =
        resource instanceof ExportableInstance
          ? ExportableAssignmentRule
          : ExportableCaretValueRule;
      // First get all possible paths for which child elements should be extracted onto an inline instance
      const basePaths = resource.rules
        .filter(
          rule =>
            rule instanceof ruleType &&
            (/^contained(\[\d+\])?\.resourceType$/.test(getRulePath(rule)) ||
              /^entry(\[\d+\])?\.resource\.resourceType$/.test(getRulePath(rule)))
        )
        .map(rule => getRulePath(rule).replace('.resourceType', ''));

      let generatedIdCount = 0;
      // For each base path, extract an inline instance
      basePaths.forEach(basePath => {
        const rulesToRemove: number[] = [];
        let id: string;
        let resourceType: string;
        let profile: string;
        const inlineInstanceRules: ExportableAssignmentRule[] = [];

        // Find all rules on the instance that are children of the base path and should be
        // added to the inline instance
        resource.rules.forEach((rule, i) => {
          if (!(rule instanceof ruleType && getRulePath(rule).startsWith(basePath))) {
            return;
          }

          rulesToRemove.push(i);
          if (rule instanceof ExportableCaretValueRule) {
            const newRule = new ExportableAssignmentRule(rule.caretPath);
            newRule.value = rule.value;
            rule = newRule;
          }
          // id and resourceType and meta.profile should be used for keywords, all other rules are added
          if (
            rule.path === `${basePath}.id` &&
            isNaN(parseInt(rule.value as string)) &&
            ![...pkg.instances, ...inlineInstances].find(
              instance => instance.name === ((rule as ExportableAssignmentRule).value as string)
            )
          ) {
            id = rule.value as string;
          } else if (rule.path === `${basePath}.resourceType`) {
            resourceType = rule.value as string;
          } else if (
            new RegExp(`^${escapeRegExp(basePath)}\\.meta\\.profile(\\[0\\])?$`).test(rule.path)
          ) {
            profile = rule.value as string;
          } else {
            const inlineInstanceRule = cloneDeep(rule);
            inlineInstanceRule.path = rule.path.replace(`${basePath}.`, '');
            inlineInstanceRules.push(inlineInstanceRule);
          }
        });

        const newInstance = new ExportableInstance(
          id ?? `Inline-Instance-for-${resource.id}-${++generatedIdCount}`
        );
        newInstance.rules.push(...inlineInstanceRules);
        newInstance.instanceOf = profile ?? resourceType;
        newInstance.usage = 'Inline';
        inlineInstances.push(newInstance);

        pullAt(resource.rules, rulesToRemove);
        if (resource instanceof ExportableInstance) {
          const inlineInstanceRule = new ExportableAssignmentRule(basePath);
          inlineInstanceRule.isInstance = true;
          inlineInstanceRule.value = newInstance.id;
          resource.rules.splice(rulesToRemove[0], 0, inlineInstanceRule);
        } else {
          const inlineInstanceRule = new ExportableCaretValueRule('');
          inlineInstanceRule.caretPath = basePath;
          inlineInstanceRule.isInstance = true;
          inlineInstanceRule.value = newInstance.id;
          resource.rules.splice(rulesToRemove[0], 0, inlineInstanceRule);
        }
      });
    });
    pkg.instances.push(...inlineInstances);
  }
} as OptimizerPlugin;

function getRulePath(rule: ExportableSdRule): string {
  return rule instanceof ExportableCaretValueRule ? rule.caretPath : rule.path;
}
