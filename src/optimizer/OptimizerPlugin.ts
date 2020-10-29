import { Package, FHIRProcessor } from '../processor';

/**
 * OptimizerPlugin defines the interface that an optimizer must support to be automatically loaded by the loadOptimizers function.
 * To take advantage of optimizer auto-loading, each optimizer should be defined in its own file in the folder that is passed to
 * loadOptimizers (e.g., src/optimizer/plugins) and the file's "default" export should be an object implementing this interface.
 */
export interface OptimizerPlugin {
  /**
   * A name (or handle) for the optimizer, allowing it to be easily referenced by other optimizers or in config files (maybe someday)
   */
  name: string;

  /**
   * A brief description indicating what the optimizer does. This description is logged when debug logging is turned on.
   */
  description: string;

  /**
   * A list of the optimizers (by name) that this optimizer should be run before (e.g., list of optimizers that depend on this one).
   * NOTE: Only one side of the relationship needs to be specified.  E.g., 'a' runBefore 'b' implies 'b' runAfter 'a'.
   */
  runBefore?: string[];

  /**
   * A list of the optimizers (by name) that this optimizer should be run after (e.g., list of optimizers that this optimizer depends on).
   * NOTE: Only one side of the relationship needs to be specified.  E.g., 'y' runAfter 'x' implies 'x' runBefore 'y'.
   */
  runAfter?: string[];

  /**
   * Optimizes definitions in the package by adding/modifying/removing definitions and/or rules.  Mutates the Package in place.
   * @param pkg - the Package containing all of the definitions that can potentially be optimized
   * @param processor - the FHIRProcessor that was used to process the package, which may be needed during optimization
   */
  optimize(pkg: Package, processor?: FHIRProcessor): void;
}
