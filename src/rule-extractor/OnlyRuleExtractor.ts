import { fhirtypes } from 'fsh-sushi/';
import { ExportableOnlyRule } from '../exportable';
import { getPath } from '../utils';

export class OnlyRuleExtractor {
  process(input: fhirtypes.ElementDefinition): ExportableOnlyRule | null {
    if (!input.type) {
      return null;
    }
    const onlyRule = new ExportableOnlyRule(getPath(input));
    input.type.forEach(t => {
      if (t.code === 'Reference' && t.targetProfile) {
        t.targetProfile.forEach(tp => onlyRule.types.push({ type: tp, isReference: true }));
      } else if (t.profile) {
        t.profile.forEach(p => onlyRule.types.push({ type: p }));
      } else {
        onlyRule.types.push({ type: t.code });
      }
    });
    return onlyRule;
  }
}
