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
  rules: AllowedRule[];
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
      const newNode: PathNode = { path: currentPath, children: [], rules: [] };
      parent.children.push(newNode);
      currentPathNode = newNode;
    }
    // Use the current path's node as the parent for the next path part
    parent = currentPathNode;
  });
  // After building the tree, add the rule in at the current node
  // since the last node will be the full rule path
  currentPathNode.rules = currentPathNode.rules.concat(rule);
}

// Build the list of rules that will create optimal context.
function createAndOrganizeRules(pathNodes: PathNode[], rules: AllowedRule[]) {
  pathNodes?.forEach(node => {
    rules.push(...node.rules);
    if (node.children.length > 1 && node.rules.length === 0) {
      // There are at least 2 children and no parent rule. Push a path rule.
      rules.push(new ExportablePathRule(node.path));
    }
    createAndOrganizeRules(node.children, rules);
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
        rules: [],
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
