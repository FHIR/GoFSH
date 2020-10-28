import { OptimizerPlugin } from './OptimizerPlugin';

import fs from 'fs-extra';
import path from 'path';
import { uniq } from 'lodash';
import toposort from 'toposort';
import { logger } from '../utils/GoFSHLogger';

/**
 * Dynamically load the optimizer plugins and return them in the order they should be executed.
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

  // read the plugins folder, filter to only .ts/.js files, and map to unique module paths (without extensions)
  const optimizerModules = uniq(
    fs
      .readdirSync(folder, { withFileTypes: true })
      .filter(f => f.isFile() && /^[^.]+.*\.(t|j)s$/.test(f.name))
      .map(f => `${relativePath}/${f.name.match(/^([^.]+)/)[1]}`)
  );

  const optimizers = (
    await Promise.all(
      // map to a set of promises that each resolve to the default export of the dynamically imported module
      optimizerModules.map(async m => {
        return (await import(m))?.default as OptimizerPlugin;
      })
    )
  ).filter(
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
    opt.runAfter?.forEach(dependsOn => edges.push([opt.name, dependsOn]));
    opt.runBefore?.forEach(dependedOnBy => edges.push([dependedOnBy, opt.name]));
  });
  let ordered: string[];
  try {
    ordered = toposort.array(nodes, edges).reverse();
  } catch (e) {
    const nodeMatch = e.message?.match(/"([^"]+)"$/);
    if (nodeMatch?.length === 2) {
      logger.error(
        `Could not determine order of optimizers; cyclic dependency involving ${nodeMatch[1]}. Optimization may be affected.`
      );
    } else {
      logger.error(
        'Could not determine order of optimizers due to a cyclic dependency. Optimization may be affected.',
        e
      );
    }
    // just resort to the original order
    ordered = nodes;
  }

  // ordered is the list of names, so map it back to the optimizers
  return ordered.map(name => optimizers.find(opt => opt.name === name));
}
