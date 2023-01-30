import { Package } from '../../processor';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { ProcessingOptions } from '../../utils';
import { ExportablePathRule } from '../../exportable';
import ConstructInlineInstanceOptimizer from './ConstructInlineInstanceOptimizer';
import SimplifyArrayIndexingOptimizer from './SimplifyArrayIndexingOptimizer';
import SimplifyRulePathContextsOptimizer from './SimplifyRulePathContextsOptimizer';

export default {
  name: 'add_path_rules',
  description: 'Add path rules to support indenting.',
  runAfter: [ConstructInlineInstanceOptimizer.name],
  runBefore: [SimplifyArrayIndexingOptimizer.name, SimplifyRulePathContextsOptimizer.name],
  optimize(pkg: Package): void {
    [
      ...pkg.profiles,
      ...pkg.extensions,
      ...pkg.logicals,
      ...pkg.resources,
      ...pkg.instances,
      ...pkg.mappings
    ].forEach(entity => {
      const seenPathList: string[] = [];
      // Iterate the rules, looking at the current rule and next rule
      for (let i = 0; i < entity.rules.length - 1; i++) {
        const rule = entity.rules[i];
        const nextRule = entity.rules[i + 1];

        // Mark the current path as seen so we never repeat it
        seenPathList.push(rule.path);

        // Skip over empty rule paths and top-level rule paths since they don't have a parent
        if (!rule.path || rule.path.indexOf('.') <= 0) {
          continue;
        }

        // Similarly, if the next rule is empty or top-level, it can't have a common ancestor
        if (!nextRule.path || nextRule.path.indexOf('.') <= 0) {
          continue;
        }

        // Walk the current rule's path backwards, looking for common ancestor path; but start
        // with 2nd-to-last part since we never need a path rule matching a real rule path
        const splitPath = rule.path.split('.');
        while (splitPath.pop() && splitPath.length) {
          const ancestorPath = splitPath.join('.');
          if (nextRule.path.startsWith(ancestorPath) && !seenPathList.includes(ancestorPath)) {
            // It's a common ancestor that we haven't seen so splice it in!
            entity.rules.splice(i, 0, new ExportablePathRule(ancestorPath));
            seenPathList.push(ancestorPath);
            // Increment i so it still references the right item (since we spliced something in)
            i++;
            break; // We only want to pull out one ancestor
          } else if (seenPathList.some(l => ancestorPath.includes(l))) {
            // Otherwise, if a path rule that has already been added is a more specific path than
            // the current ancestor path, then stop. This prevents us from adding a path for
            // meta.extension and later a path for meta.
            break;
          }
        }
      }
    });
  },
  isEnabled(options: ProcessingOptions): boolean {
    return options.indent === true;
  }
} as OptimizerPlugin;
