import { OptimizerPlugin } from '../../../../src/optimizer/OptimizerPlugin';
import { ProcessingOptions } from '../../../../src/utils';

export default {
  name: 'b',
  description: 'B Optimizer',
  optimize(): void {},
  isEnabled(options: ProcessingOptions) {
    return options.bFlag === true;
  }
} as OptimizerPlugin;
