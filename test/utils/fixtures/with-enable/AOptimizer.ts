import { OptimizerPlugin } from '../../../../src/optimizer/OptimizerPlugin';
import { ProcessingOptions } from '../../../../src/utils';

export default {
  name: 'a',
  description: 'A Optimizer',
  runAfter: ['b'],
  optimize(): void {},
  isEnabled(options: ProcessingOptions): boolean {
    return options.aName === 'A';
  }
} as OptimizerPlugin;
