import { OptimizerPlugin } from '../../../../src/optimizer/OptimizerPlugin';

export default {
  name: 'a',
  description: 'A Optimizer',
  runAfter: ['c'],
  runBefore: ['b'],
  optimize(): void {}
} as OptimizerPlugin;
