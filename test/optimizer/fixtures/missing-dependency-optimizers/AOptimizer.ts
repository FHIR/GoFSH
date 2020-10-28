import { OptimizerPlugin } from '../../../../src/optimizer/OptimizerPlugin';

export default {
  name: 'a',
  description: 'A Optimizer',
  runAfter: ['b'],
  runBefore: ['e'],
  optimize(): void {}
} as OptimizerPlugin;
