import { OptimizerPlugin } from '../../../../src/optimizer/OptimizerPlugin';

export default {
  name: 'c',
  description: 'C Optimizer',
  runAfter: ['b'], // <-- circular w/ b
  runBefore: ['a'],
  optimize(): void {}
} as OptimizerPlugin;
