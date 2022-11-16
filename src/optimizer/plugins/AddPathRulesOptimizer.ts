import { Package } from '../../processor';
import { OptimizerPlugin } from '../OptimizerPlugin';
import SimplifyArrayIndexingOptimizer from './SimplifyArrayIndexingOptimizer';
import { ProcessingOptions } from '../../utils';
import { ExportablePathRule, ExportableSdRule } from '../../exportable';
import { cloneDeep } from 'lodash';
import SimplifyRulePathContextsOptimizer from './SimplifyRulePathContextsOptimizer';

export default {
  name: 'add_path_rules',
  description: 'Add path rules to support indenting.',
  runBefore: [SimplifyArrayIndexingOptimizer.name, SimplifyRulePathContextsOptimizer.name],
  optimize(pkg: Package): void {
    [
      ...pkg.profiles,
      ...pkg.extensions,
      ...pkg.logicals,
      ...pkg.resources,
      ...pkg.instances
    ].forEach(entity => {
      let currentRulePath: string;
      let slicedRulePath: string;
      let previousSlicedRulePath: string;
      const seenPathList: string[] = [];
      const parentList: string[] = [];
      let entityIndex = -1;
      const cloneEntity = cloneDeep(entity);
      cloneEntity.rules.forEach(rule => {
        currentRulePath = rule.path;
        entityIndex++;
        //skip over empty rule paths
        if (!currentRulePath || currentRulePath === '.') return;
        //if it's a parent rule path, push it to a seperate list then skip
        if (!currentRulePath.includes('.')) {
          if (!parentList.includes(currentRulePath)) parentList.push(currentRulePath);
          return;
        }
        const index = currentRulePath.lastIndexOf('.');
        slicedRulePath = currentRulePath.slice(0, index);

        if (
          slicedRulePath === previousSlicedRulePath &&
          //slicedRulePath &&
          !seenPathList.includes(slicedRulePath) &&
          !parentList.includes(slicedRulePath)
        ) {
          const newParent = new ExportablePathRule(slicedRulePath);
          //insert the new path rule above the initial duplicate rule path
          entity.rules.splice(entityIndex - 1, 0, newParent as ExportableSdRule);
          seenPathList.push(slicedRulePath);
          entityIndex++;
        }
        //set previous path for the next loop
        previousSlicedRulePath = slicedRulePath;
      });
    });
  },
  isEnabled(options: ProcessingOptions): boolean {
    return options.indent === true;
  }
} as OptimizerPlugin;
