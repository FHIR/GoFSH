import { fhirtypes } from 'fsh-sushi';
import { ProcessableElementDefinition } from '../processor';
import { ExportableFixedValueRule } from '../exportable';
import { getPath } from '../utils';

export class FixedValueRuleExtractor {
  static process(input: ProcessableElementDefinition): ExportableFixedValueRule | null {
    // check for fixedSomething or patternSomething
    // pattern and fixed are mutually exclusive
    // these are on one-type elements, so if our SD has value[x],
    // this element might be something like valueString
    const matchingKey = Object.keys(input).find(
      key => key.startsWith('fixed') || key.startsWith('pattern')
    );
    if (matchingKey) {
      const matchingValue = input[matchingKey as keyof fhirtypes.ElementDefinition];
      if (isPrimitiveValue(matchingValue)) {
        const fixedValueRule = new ExportableFixedValueRule(getPath(input));
        fixedValueRule.fixedValue = matchingValue;
        if (matchingKey.startsWith('fixed')) {
          fixedValueRule.exactly = true;
        }
        input.processedPaths.push(matchingKey);
        return fixedValueRule;
      }
      // TODO: Add logic for complex values and adding complex paths to processedPaths
    }
    return null;
  }
}

type primitiveValueTypes = number | string | boolean;

function isPrimitiveValue(value: any): value is primitiveValueTypes {
  return typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number';
}
