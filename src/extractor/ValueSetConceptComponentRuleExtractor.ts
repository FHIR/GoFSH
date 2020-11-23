import { fshtypes, fhirtypes } from 'fsh-sushi';
import { cloneDeep } from 'lodash';
import { ExportableValueSetConceptComponentRule } from '../exportable';

export class ValueSetConceptComponentRuleExtractor {
  static process(
    vsComponent: fhirtypes.ValueSetComposeIncludeOrExclude,
    inclusion: boolean
  ): ExportableValueSetConceptComponentRule {
    if (vsComponent.concept?.length > 0) {
      const rule = new ExportableValueSetConceptComponentRule(inclusion);
      rule.from.system = vsComponent.system;
      rule.from.valueSets = cloneDeep(vsComponent.valueSet);
      vsComponent.concept.forEach((concept: any) => {
        rule.concepts.push(new fshtypes.FshCode(concept.code, vsComponent.system, concept.display));
      });
      if (rule.concepts.length > 0) {
        return rule;
      }
    }
    return null;
  }
}
