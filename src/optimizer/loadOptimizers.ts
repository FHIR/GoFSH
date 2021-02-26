import { OptimizerPlugin } from './OptimizerPlugin';
import path from 'path';
import toposort from 'toposort';
import { logger } from '../utils/GoFSHLogger';

/**
 * Dynamically load the optimizer plugins and return them in the order they should be executed.
 * If there is a circular dependency in the plugins, an error will be logged and the resulting order is undetermined.
 * @param folder - the folder to load optimizers from.  Currently only used in tests.  CLI uses default value.
 */
export async function loadOptimizers(
  folder = path.join(__dirname, 'plugins')
): Promise<OptimizerPlugin[]> {
  // make an import-friendly relative path (e.g. \Users\bob\dev\optimizers --> ../../../../dev/optimizers)
  let relativePath = path.relative(__dirname, folder);
  if (path.sep === '\\') {
    relativePath = relativePath.replace(/\\/g, '/');
  }
  if (!relativePath.startsWith('.')) {
    relativePath = `./${relativePath}`;
  }

  // Import optimizers from the specified folder
  // relativePath is placed in a dynamic string to allow for FSHOnline compatibility
  const Optimizers: { property: OptimizerPlugin } = await import(`${relativePath}`);

  const optimizers = Object.values(Optimizers).filter(
    // Remove non-optimizers
    o =>
      typeof o?.name === 'string' &&
      typeof o?.description === 'string' &&
      typeof o?.optimize === 'function'
  );
  logger.debug(`Loaded ${optimizers.length} optimizers from ${path.join(__dirname, 'plugins')}`);
  // Sort them using a topological sort to get them in dependency order
  // See: https://www.npmjs.com/package/toposort#sorting-dependencies
  const nodes: string[] = [];
  const edges: [string, string][] = [];
  optimizers.forEach(opt => {
    nodes.push(opt.name);
    opt.runAfter?.forEach(dependsOn => {
      if (optimizers.some(o => o.name === dependsOn)) {
        edges.push([opt.name, dependsOn]);
      } else {
        logger.error(
          `The ${opt.name} optimizer specifies an unknown optimizer in runAfter: ${dependsOn}`
        );
      }
    });
    opt.runBefore?.forEach(dependedOnBy => {
      if (optimizers.some(o => o.name === dependedOnBy)) {
        edges.push([dependedOnBy, opt.name]);
      } else {
        logger.error(
          `The ${opt.name} optimizer specifies an unknown optimizer in runBefore: ${dependedOnBy}`
        );
      }
    });
  });
  let ordered: string[];
  try {
    ordered = toposort.array(nodes, edges).reverse();
  } catch (e) {
    // This message should be reliably present and reliably in this format, but use '?' defensively just in case
    const nodeMatch = e.message?.match(/"([^"]+)"$/);
    logger.error(
      `Could not determine order of optimizers; cyclic dependency involving ${nodeMatch?.[1]}. Optimization may be affected.`
    );
    // just return the original order
    ordered = nodes;
  }

  // ordered is the list of names, so map it back to the optimizers
  return ordered.map(name => optimizers.find(opt => opt.name === name));
}
