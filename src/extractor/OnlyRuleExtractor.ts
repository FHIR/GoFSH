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
      if (t.code === 'Reference' && t.targetProfile) {
        t.targetProfile.forEach((tp, tpi) => {
          onlyRule.types.push({ type: tp, isReference: true });
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
