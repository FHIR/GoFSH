import { fshtypes } from 'fsh-sushi';
import { cloneDeep } from 'lodash';
import { ExportableValueSetConceptComponentRule } from '../exportable';
import { ProcessableValueSetComponent } from '../processor';

export class ValueSetConceptComponentRuleExtractor {
  static process(
    vsComponent: ProcessableValueSetComponent,
    include: boolean
  ): ExportableValueSetConceptComponentRule {
    if (vsComponent.concept?.length > 0) {
      const rule = new ExportableValueSetConceptComponentRule(include);
      rule.from.system = vsComponent.system;
      rule.from.valueSets = cloneDeep(vsComponent.valueSet);
      vsComponent.concept.forEach(concept => {
        if (ValueSetConceptComponentRuleExtractor.isConceptComponent(concept)) {
          rule.concepts.push(
            new fshtypes.FshCode(concept.code, vsComponent.system, concept.display)
          );
        }
      });
      if (rule.concepts.length > 0) {
        return rule;
      }
    }
    return null;
  }

  static isConceptComponent(input: any): input is ConceptComponent {
    return typeof input.code === 'string';
  }
}

// code is required by FHIR spec, but our type does not assume it is defined
// see http://hl7.org/fhir/r4/valueset-definitions.html#ValueSet.compose.include.concept.code
interface ConceptComponent {
  code: string;
  display?: string;
}
