import { Package } from '../../processor';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { ProcessingOptions } from '../../utils';
import {
  ExportableAddElementRule,
  ExportableMappingRule,
  ExportablePathRule,
  ExportableSdRule
} from '../../exportable';
import ConstructInlineInstanceOptimizer from './ConstructInlineInstanceOptimizer';
import SimplifyArrayIndexingOptimizer from './SimplifyArrayIndexingOptimizer';
import SimplifyRulePathContextsOptimizer from './SimplifyRulePathContextsOptimizer';

// NOTE: These are the rule types that are allowed on the entities that are optimized
// by this optimizer. Type is created to allow specificity and convenience.
type AllowedRule =
  | ExportableMappingRule
  | ExportablePathRule
  | ExportableAddElementRule
  | ExportableSdRule;

type PathNode = {
  path: string;
  rule?: AllowedRule[];
  children: PathNode[];
};

// Create a tree with a node for each path part for all rules
function buildPathTree(parent: PathNode, rule: AllowedRule) {
  // We want to process each part, so split at each . not within []
  // Because we want to consider each slice and index within the path as a
  // unique path, we don't want to use the full parseFSHPath.
  const pathParts = rule.path === '.' ? [rule.path] : rule.path.split(/\.(?![^\[]*\])/g);
  let currentPath = '';
  let currentPathNode: PathNode;
  pathParts.forEach(part => {
    currentPath = currentPath === '' ? part : `${currentPath}.${part}`; // build the path back up
    currentPathNode = parent.children.find(child => child.path === currentPath);
    if (currentPathNode == null) {
      // If this path hasn't been seen, create a node for it in the tree
      const newNode: PathNode = { path: currentPath, children: [] };
      // If the current path is also the rule path, we want to include the rule on the node
      if (currentPath === rule.path) {
        newNode.rule = [rule];
      }
      parent.children.push(newNode);

      // Use the current path's node as the parent for the next path part
      parent = newNode;
    } else {
      // If the current path is also the rule path but that path's node was previously added to the tree,
      // we still want to add the rule to node so the rule is tracked
      if (currentPath === rule.path) {
        currentPathNode.rule = (currentPathNode.rule ?? []).concat(rule);
      }

      // Use the current path's node as the parent for the next path part
      parent = currentPathNode;
    }
  });
}

// Build the list of rules that will create optimal context.
function createAndOrganizeRules(pathNodes: PathNode[], rules: AllowedRule[]) {
  pathNodes?.forEach(node => {
    if (node.children.length > 1) {
      // There are at least 2 children. Create a path rule if necessary,
      // otherwise just include the rule at that path.
      if (node.rule == null) {
        rules.push(new ExportablePathRule(node.path));
      } else {
        rules.push(...node.rule);
      }
      // Continue processing all child nodes
      createAndOrganizeRules(node.children, rules);
    } else {
      // If there are 0 or 1 rules at the path, we don't need to create a path rule,
      // but we do need to include the rule if there is one at that path.
      if (node.rule != null) {
        rules.push(...node.rule);
      }
      // If this path has a child, continue processing the child node.
      if (node.children.length > 0) {
        createAndOrganizeRules(node.children, rules);
      }
    }
  });
}

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
      const root: PathNode = {
        path: '',
        rule: null,
        children: []
      };

      // Build a tree of paths used in rules
      entity.rules.forEach(rule => {
        buildPathTree(root, rule);
      });

      // Create a new list of rules which will have optimal path context.
      // This may mean adding path rules as necessary and changing the order
      // of rules in order to optimize context.
      const rulesWithPathRules: AllowedRule[] = [];
      createAndOrganizeRules(root.children, rulesWithPathRules);
      entity.rules = rulesWithPathRules;
    });
  },
  isEnabled(options: ProcessingOptions): boolean {
    return options.indent === true;
  }
} as OptimizerPlugin;
