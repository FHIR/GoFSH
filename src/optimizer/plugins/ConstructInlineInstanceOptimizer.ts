import { pullAt, cloneDeep, isEqual } from 'lodash';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableInstance,
  ExportableSdRule,
  ExportablePathRule
} from '../../exportable';
import { hasGeneratedText } from './RemoveGeneratedTextRulesOptimizer';
import RemoveGeneratedTextRulesOptimizer from './RemoveGeneratedTextRulesOptimizer';
import ResolveInstanceOfURLsOptimizer from './ResolveInstanceOfURLsOptimizer';
import AddReferenceKeywordOptimizer from './AddReferenceKeywordOptimizer';
import { MasterFisher, logger, ProcessingOptions } from '../../utils';
import { utils } from 'fsh-sushi';

export default {
  name: 'construct_inline_instance',
  description:
    'Construct inline instances from groups of rules in a contained resource or a Bundle',
  runBefore: [
    RemoveGeneratedTextRulesOptimizer.name,
    ResolveInstanceOfURLsOptimizer.name,
    AddReferenceKeywordOptimizer.name
  ],

  optimize(pkg: Package, fisher: MasterFisher, options: ProcessingOptions = {}): void {
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
        const profileIndices: number[] = [];
        const inlineInstanceRules: ExportableAssignmentRule[] = [];

        // Find all rules on the instance that are children of the base path and should be
        // added to the inline instance
        resource.rules.forEach((r, i) => {
          if (!(r instanceof ruleType && getRulePath(r).startsWith(basePath))) {
            return;
          }

          rulesToRemove.push(i);

          let rule = r as ExportableAssignmentRule | ExportableCaretValueRule;
          if (rule instanceof ExportableCaretValueRule) {
            const newRule = new ExportableAssignmentRule(rule.caretPath);
            newRule.value = rule.value;
            rule = newRule;
          }

          // id and resourceType and meta.profile should be used for keywords, all other rules are added
          if (
            rule.path === `${basePath}.id` &&
            ![...pkg.instances, ...inlineInstances].find(
              instance => instance.id === ((rule as ExportableAssignmentRule).value as string)
            )
          ) {
            id = rule.value as string;
          } else if (rule.path === `${basePath}.resourceType`) {
            resourceType = rule.value as string;
          } else {
            const inlineInstanceRule = cloneDeep(rule);
            inlineInstanceRule.path = rule.path.replace(`${basePath}.`, '');
            // if this rule is on meta.profile, save its index to check later
            if (/^meta\.profile(\[\d+\])?$/.test(inlineInstanceRule.path)) {
              profileIndices.push(inlineInstanceRules.length);
            }
            inlineInstanceRules.push(inlineInstanceRule);
          }
        });

        let newInstance = new ExportableInstance(
          id ?? `Inline-Instance-for-${resource.id}-${++generatedIdCount}`
        );

        // if a profile is available and the user wants it, try to fish it up and use it as InstanceOf
        if (
          (profileIndices.length === 1 && options.metaProfile !== 'none') ||
          (profileIndices.length > 0 && options.metaProfile === 'first')
        ) {
          const profileToTry = inlineInstanceRules[profileIndices[0]].value as string;
          const instanceOfJSON = fisher.fishForFHIR(
            profileToTry,
            utils.Type.Resource,
            utils.Type.Profile,
            utils.Type.Extension,
            utils.Type.Type
          );
          if (instanceOfJSON == null) {
            newInstance.instanceOf = resourceType;
            logger.warn(
              `InstanceOf definition not found for ${newInstance.id}. The ResourceType of the instance will be used as a base.`
            );
          } else {
            newInstance.instanceOf = profileToTry;
            // since we are going to remove meta.profile[0], decrement the indices on other meta.profile[i] rules
            profileIndices.slice(1).forEach(idx => {
              const profileRule = inlineInstanceRules[idx];
              const profileIndex = profileRule.path.match(/^meta\.profile\[(\d+)\]$/)[1];
              profileRule.path = `meta.profile[${parseInt(profileIndex, 10) - 1}]`;
            });
            // remove the rule on meta.profile[0]
            inlineInstanceRules.splice(profileIndices[0], 1);
          }
        } else {
          newInstance.instanceOf = resourceType;
        }
        newInstance.rules.push(...inlineInstanceRules);
        newInstance.usage = 'Inline';

        const duplicatedInstance = duplicatesExistingInstance(newInstance, [
          ...inlineInstances,
          ...pkg.instances
        ]);
        if (duplicatedInstance) {
          newInstance = duplicatedInstance;
        } else {
          inlineInstances.push(newInstance);
        }

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

function getRulePath(rule: ExportableSdRule | ExportablePathRule): string {
  return rule instanceof ExportableCaretValueRule ? rule.caretPath : rule.path;
}

function duplicatesExistingInstance(
  instance: ExportableInstance,
  existingInstances: ExportableInstance[]
): ExportableInstance {
  const instanceId =
    ((instance.rules.find(rule => rule.path === 'id') as ExportableAssignmentRule)
      ?.value as string) ?? instance.id;

  const duplicatedInstance = existingInstances.find(
    i => i.id === instanceId && i.instanceOf === instance.instanceOf
  );

  // We need to ignore generated text rules, since these will be later removed anyway, and will not match
  // between an instance and the inline version of that instance
  const instanceHasGeneratedText = hasGeneratedText(instance);
  const duplicatedInstanceHasGeneratedText =
    duplicatedInstance != null && hasGeneratedText(duplicatedInstance);
  if (
    isEqual(
      instance.rules.filter(
        rule => rule.path !== 'id' && !(instanceHasGeneratedText && rule.path.match(/^text\./))
      ),
      duplicatedInstance?.rules?.filter(
        rule => !(duplicatedInstanceHasGeneratedText && rule.path.match(/^text\./))
      )
    )
  ) {
    return duplicatedInstance;
  }
}
