import { fshtypes, fhirtypes } from 'fsh-sushi';
import { logger } from '../utils';
import { ExportableValueSetFilterComponentRule } from '../exportable';
import { ProcessableValueSet } from '../processor';

export class ValueSetFilterComponentRuleExtractor {
  static process(
    vsComponent: fhirtypes.ValueSetComposeIncludeOrExclude,
    valueSet: ProcessableValueSet,
    inclusion: boolean
  ): ExportableValueSetFilterComponentRule {
    if (vsComponent.concept?.length && !vsComponent.filter?.length) {
      // This is a concept rule that should be handled by ValueSetConceptComponentRuleExtractor
      return;
    }
    const filterRule = new ExportableValueSetFilterComponentRule(inclusion);
    // * include/exclude codes from...
    if (vsComponent.system || vsComponent.valueSet) {
      filterRule.from = {};
      if (vsComponent.system) {
        filterRule.from.system = vsComponent.system;
        if (vsComponent.version) {
          filterRule.from.system += `|${vsComponent.version}`;
        }
      }
      if (vsComponent.valueSet) {
        filterRule.from.valueSets = vsComponent.valueSet;
      }
    }
    // ... where ...
    if (vsComponent.filter) {
      filterRule.filters = vsComponent.filter.map(f => {
        let value: fshtypes.ValueSetFilterValue;
        switch (f.op) {
          case fshtypes.VsOperator.EQUALS:
          case fshtypes.VsOperator.IN:
          case fshtypes.VsOperator.NOT_IN:
            // value should be a string
            value = f.value;
            break;
          case fshtypes.VsOperator.IS_A:
          case fshtypes.VsOperator.DESCENDENT_OF:
          case fshtypes.VsOperator.IS_NOT_A:
          case fshtypes.VsOperator.GENERALIZES:
            // value should be a code
            value = new fshtypes.FshCode(f.value);
            break;
          case fshtypes.VsOperator.REGEX:
            // value should be a regular expression
            value = new RegExp(f.value);
            break;
          case fshtypes.VsOperator.EXISTS:
            // value should be a boolean
            value = f.value === 'true';
            break;
          default:
            // unknown operator type; default to a string value
            value = f.value;
            logger.error(`Unsuported filter operator in ValueSet ${valueSet.id}: ${f.op}`);
        }
        return {
          property: f.property,
          operator: f.op as fshtypes.VsOperator,
          value
        };
      });
    }

    return filterRule;
  }
}
