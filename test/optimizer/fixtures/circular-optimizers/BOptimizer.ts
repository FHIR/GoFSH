import { OptimizerPlugin } from '../../../../src/optimizer/OptimizerPlugin';

export default {
  name: 'b',
  description: 'B Optimizer',
  runAfter: ['c'], // <-- circular w/ c
  runBefore: ['e'],
  optimize(): void {}
} as OptimizerPlugin;
