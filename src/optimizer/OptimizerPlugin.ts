import { Package, FHIRProcessor } from '../processor';

export interface OptimizerPlugin {
  name: string;
  description: string;
  runBefore?: string[];
  runAfter?: string[];
  optimize(pkg: Package, processor?: FHIRProcessor): void;
}
