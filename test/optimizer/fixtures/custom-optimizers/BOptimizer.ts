import { OptimizerPlugin } from '../../../../src/optimizer/OptimizerPlugin';

export default {
  name: 'b',
  description: 'B Optimizer',
  runBefore: ['e'],
  optimize(): void {}
} as OptimizerPlugin;
