import { fhirdefs } from 'fsh-sushi';
import { ProcessableElementDefinition } from '../processor';
import { ExportableCaretValueRule } from '../exportable';
import { getFSHValue, getPath, getPathValuePairs } from '../utils';

export class CaretValueRuleExtractor {
  static process(
    input: ProcessableElementDefinition,
    fhir: fhirdefs.FHIRDefinitions
  ): ExportableCaretValueRule[] {
    // Convert to json to remove extra private properties on fhirtypes.ElementDefinition
    const path = getPath(input);
    const inputJSON = input.toJSON();
    input.processedPaths.push('id', 'path');
    const flatElement = getPathValuePairs(inputJSON);
    const caretValueRules: ExportableCaretValueRule[] = [];
    const remainingPaths = Object.keys(flatElement).filter(p => !input.processedPaths.includes(p));
    remainingPaths.forEach(key => {
      const caretValueRule = new ExportableCaretValueRule(path);
      caretValueRule.caretPath = key;
      caretValueRule.value = getFSHValue(key, flatElement[key], input, fhir);
      caretValueRules.push(caretValueRule);
    });
    return caretValueRules;
  }
}
