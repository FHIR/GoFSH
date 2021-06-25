import { OptimizerPlugin, OptimizerOptions } from '../../../../src/optimizer/OptimizerPlugin';

export default {
  name: 'a',
  description: 'A Optimizer',
  runAfter: ['b'],
  optimize(): void {},
  enable(options: OptimizerOptions): boolean {
    return options.aName === 'A';
  }
} as OptimizerPlugin;
