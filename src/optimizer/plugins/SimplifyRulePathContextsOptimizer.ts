import { Package } from '../../processor';
import { OptimizerPlugin } from '../OptimizerPlugin';
import SimplifyArrayIndexingOptimizer from './SimplifyArrayIndexingOptimizer';
import { ProcessingOptions } from '../../utils';

export default {
  name: 'simplify_rule_path_contexts',
  description:
    'Make rule paths shorter by indenting the rule and using the context of preceding rules.',
  runAfter: [SimplifyArrayIndexingOptimizer.name],
  optimize(pkg: Package): void {
    [
      ...pkg.profiles,
      ...pkg.extensions,
      ...pkg.logicals,
      ...pkg.resources,
      ...pkg.instances
    ].forEach(entity => {
      const pathContext: string[] = [];
      let contextIndex: number;
      entity.rules.forEach(rule => {
        const rulePathParts = rule.path.split('.');
        // check if we can use an existing context
        // check contexts at the end first so we use as deep a context as possible
        for (contextIndex = pathContext.length - 1; contextIndex >= 0; contextIndex--) {
          const contextPathParts = pathContext[contextIndex].split('.');
          if (contextPathParts.every((contextPart, idx) => contextPart === rulePathParts[idx])) {
            break;
          }
        }
        if (contextIndex > -1) {
          // if our contextIndex ended up at least 0, we found a context to use!
          rule.indent = contextIndex + 1;
          // splice off from pathContext everything we're not using from pathContext
          pathContext.splice(contextIndex + 1);
          // rebuild the rule's path based on the context we're using now
          // keep parts of the existing rule path starting at the index = number of parts from the path context being used
          const newPath = rulePathParts
            .splice(pathContext[pathContext.length - 1].split('.').length)
            .join('.');
          // if the rule has any path left after that, push its full path onto the pathContext list
          if (newPath.length) {
            // change soft-index marker because a matching path should use [=]
            pathContext.push(rule.path.replace(/\[\+\]/g, '[=]'));
          }
          // assign the new path to the rule
          rule.path = newPath;
        } else {
          // we didn't find a context to use. so, the indent will be 0.
          rule.indent = 0;
          // get rid of all existing contexts, and push this rule's path on to pathContext
          pathContext.splice(0);
          // change soft-index marker because a matching path should use [=]
          pathContext.push(rule.path.replace(/\[\+\]/g, '[=]'));
        }
      });
    });
  },
  isEnabled(options: ProcessingOptions): boolean {
    return options.indent === true;
  }
} as OptimizerPlugin;
