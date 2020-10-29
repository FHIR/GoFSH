import { OptimizerPlugin } from '../../../../src/optimizer/OptimizerPlugin';

export default {
  name: 'c',
  description: 'C Optimizer',
  runAfter: ['b', 'z', 'y'],
  runBefore: ['a'],
  optimize(): void {}
} as OptimizerPlugin;
