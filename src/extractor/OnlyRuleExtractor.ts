import { fshrules } from 'fsh-sushi';
import { ProcessableElementDefinition } from '../processor';
import { ExportableOnlyRule } from '../exportable';
import { getPath } from '../utils';

export class OnlyRuleExtractor {
  static process(input: ProcessableElementDefinition): ExportableOnlyRule | null {
    if (!input.type) {
      return null;
    }
    const onlyRule = new ExportableOnlyRule(getPath(input));
    input.type.forEach((t, i) => {
      if (['Reference', 'CodeableReference', 'canonical'].includes(t.code) && t.targetProfile) {
        const targeting: Partial<fshrules.OnlyRuleType> = {};
        if (t.code === 'Reference') {
          targeting.isReference = true;
        } else if (t.code === 'CodeableReference') {
          targeting.isCodeableReference = true;
        } else {
          targeting.isCanonical = true;
        }
        t.targetProfile.forEach((tp, tpi) => {
          onlyRule.types.push(Object.assign({ type: tp }, targeting));
          input.processedPaths.push(`type[${i}].targetProfile[${tpi}]`);
        });
      } else if (t.profile) {
        t.profile.forEach((p, pi) => {
          onlyRule.types.push({ type: p });
          input.processedPaths.push(`type[${i}].profile[${pi}]`);
        });
      } else {
        onlyRule.types.push({ type: t.code });
      }
      input.processedPaths.push(`type[${i}].code`);
    });
    return onlyRule;
  }
}
