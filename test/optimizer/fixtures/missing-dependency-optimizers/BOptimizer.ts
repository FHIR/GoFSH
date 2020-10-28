import { OptimizerPlugin } from '../../../../src/optimizer/OptimizerPlugin';

export default {
  name: 'b',
  description: 'B Optimizer',
  runBefore: ['e', 'x'],
  optimize(): void {}
} as OptimizerPlugin;
