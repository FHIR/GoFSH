import { OptimizerPlugin } from '../../../../src/optimizer/OptimizerPlugin';

export default {
  name: 'c',
  description: 'C Optimizer',
  runAfter: ['b'],
  runBefore: ['a'],
  optimize(): void {}
} as OptimizerPlugin;
