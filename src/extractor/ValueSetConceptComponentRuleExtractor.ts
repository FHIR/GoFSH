import { fshtypes } from 'fsh-sushi';
import { cloneDeep } from 'lodash';
import { ExportableValueSetConceptComponentRule } from '../exportable';
import { ProcessableValueSetComponent } from '../processor';

export class ValueSetConceptComponentRuleExtractor {
  static process(
    vsComponent: ProcessableValueSetComponent,
    inclusion: boolean
  ): ExportableValueSetConceptComponentRule {
    if (vsComponent.concept?.length > 0) {
      const rule = new ExportableValueSetConceptComponentRule(inclusion);
      rule.from.system = vsComponent.system;
      rule.from.valueSets = cloneDeep(vsComponent.valueSet);
      vsComponent.concept.forEach(concept => {
        rule.concepts.push(new fshtypes.FshCode(concept.code, vsComponent.system, concept.display));
      });
      if (rule.concepts.length > 0) {
        return rule;
      }
    }
    return null;
  }
}
