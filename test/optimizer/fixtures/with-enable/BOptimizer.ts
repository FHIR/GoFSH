import { OptimizerPlugin, OptimizerOptions } from '../../../../src/optimizer/OptimizerPlugin';

export default {
  name: 'b',
  description: 'B Optimizer',
  optimize(): void {},
  enable(options: OptimizerOptions) {
    return options.bFlag === true;
  }
} as OptimizerPlugin;
