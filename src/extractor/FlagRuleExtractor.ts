import { ProcessableElementDefinition } from '../processor';
import { ExportableFlagRule } from '../exportable';
import { getPath } from '../utils';

export class FlagRuleExtractor {
  static process(input: ProcessableElementDefinition): ExportableFlagRule | null {
    const standardStatusIndex = input.extension?.findIndex(
      ext =>
        ext.url === 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status'
    );
    const standardStatus = input.extension?.[standardStatusIndex]?.valueCode;
    if (
      ['draft', 'normative', 'trial-use'].includes(standardStatus) ||
      input.mustSupport ||
      input.isSummary ||
      input.isModifier
    ) {
      const flagRule = new ExportableFlagRule(getPath(input));
      if (input.mustSupport) {
        flagRule.mustSupport = true;
        input.processedPaths.push('mustSupport');
      }
      if (input.isSummary) {
        flagRule.summary = true;
        input.processedPaths.push('isSummary');
      }
      if (input.isModifier) {
        flagRule.modifier = true;
        input.processedPaths.push('isModifier');
      }
      if (standardStatus === 'draft') {
        flagRule.draft = true;
      } else if (standardStatus === 'normative') {
        flagRule.normative = true;
      } else if (standardStatus === 'trial-use') {
        flagRule.trialUse = true;
      }
      if (standardStatusIndex >= 0) {
        input.processedPaths.push(
          `extension[${standardStatusIndex}].url`,
          `extension[${standardStatusIndex}].valueCode`
        );
      }
      return flagRule;
    } else {
      return null;
    }
  }
}
