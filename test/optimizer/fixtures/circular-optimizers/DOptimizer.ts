import { OptimizerPlugin } from '../../../../src/optimizer/OptimizerPlugin';

export default {
  name: 'd',
  description: 'D Optimizer',
  runBefore: ['e', 'b'],
  optimize(): void {}
} as OptimizerPlugin;
