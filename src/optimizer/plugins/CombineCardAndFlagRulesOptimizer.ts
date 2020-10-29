import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import {
  ExportableCardRule,
  ExportableCombinedCardFlagRule,
  ExportableFlagRule
} from '../../exportable';
import RemoveImpliedZeroZeroCardRulesOptimizer from './RemoveImpliedZeroZeroCardRulesOptimizer';
import { pullAt } from 'lodash';

export default {
  name: 'combine_card_and_flag_rules',
  description:
    'Combine card rules (foo 1..1) and flag rules (foo MS) into a single rule (foo 1..1 MS)',
  runAfter: [RemoveImpliedZeroZeroCardRulesOptimizer.name],

  optimize(pkg: Package): void {
    [...pkg.profiles, ...pkg.extensions].forEach(sd => {
      const rulesToRemove: number[] = [];
      sd.rules.forEach((rule, i) => {
        if (rule instanceof ExportableCardRule) {
          const flagRuleIdx = sd.rules.findIndex(
            other => other.path === rule.path && other instanceof ExportableFlagRule
          );
          if (flagRuleIdx >= 0) {
            sd.rules[i] = new ExportableCombinedCardFlagRule(
              rule.path,
              rule,
              sd.rules[flagRuleIdx] as ExportableFlagRule
            );
            rulesToRemove.push(flagRuleIdx);
          }
        }
      });
      pullAt(sd.rules, rulesToRemove);
    });
  }
} as OptimizerPlugin;
