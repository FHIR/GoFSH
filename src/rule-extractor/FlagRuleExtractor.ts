import { FlagRule } from 'fsh-sushi/dist/fshtypes/rules';
import { ElementDefinition } from 'fsh-sushi/dist/fhirtypes';
import { getPath } from '../utils';

export class FlagRuleExtractor {
  process(input: ElementDefinition): FlagRule | null {
    const standardStatus = input.extension?.find(
      ext =>
        ext.url === 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status'
    )?.valueCode;

    if (
      ['draft', 'normative', 'trial-use'].includes(standardStatus) ||
      input.mustSupport ||
      input.isSummary ||
      input.isModifier
    ) {
      const flagRule = new FlagRule(getPath(input));
      if (input.mustSupport) {
        flagRule.mustSupport = true;
      }
      if (input.isSummary) {
        flagRule.summary = true;
      }
      if (input.isModifier) {
        flagRule.modifier = true;
      }
      if (standardStatus === 'draft') {
        flagRule.draft = true;
      } else if (standardStatus === 'normative') {
        flagRule.normative = true;
      } else if (standardStatus === 'trial-use') {
        flagRule.trialUse = true;
      }
      return flagRule;
    } else {
      return null;
    }
  }
}
