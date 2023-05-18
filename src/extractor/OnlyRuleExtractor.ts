import { ProcessableElementDefinition } from '../processor';
import { ExportableOnlyRule } from '../exportable';
import { getPath } from '../utils';

export class OnlyRuleExtractor {
  static process(input: ProcessableElementDefinition): ExportableOnlyRule[] {
    if (!input.type) {
      return [];
    }
    const onlyRule = new ExportableOnlyRule(getPath(input));
    const codeableReferenceTargets: string[] = [];
    input.type.forEach((t, i) => {
      if (['Reference', 'CodeableReference'].includes(t.code) && t.targetProfile) {
        t.targetProfile.forEach((tp, tpi) => {
          if (t.code === 'CodeableReference') {
            codeableReferenceTargets.push(tp);
          } else {
            onlyRule.types.push({ type: tp, isReference: true });
          }
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

    if (codeableReferenceTargets.length > 0) {
      // if this is a choice element with at least one CodeableReference target profile,
      // we will need to return two rules: one that constrains the element's types,
      // and one that sets the target profiles for the CodeableReference type choice.
      // if this is not a choice element, just make these into the reference types on the onlyRule.
      if (onlyRule.path.endsWith('[x]')) {
        const codeableReferencePath = onlyRule.path.replace(/\[x]$/, 'CodeableReference');
        const codeableReferenceRule = new ExportableOnlyRule(codeableReferencePath);
        codeableReferenceRule.types = codeableReferenceTargets.map(tp => ({
          type: tp,
          isReference: true
        }));
        onlyRule.types.push({ type: 'CodeableReference' });
        return [onlyRule, codeableReferenceRule];
      } else {
        onlyRule.types = codeableReferenceTargets.map(tp => ({ type: tp, isReference: true }));
        return [onlyRule];
      }
    } else {
      return [onlyRule];
    }
  }
}
