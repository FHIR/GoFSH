import { fhirtypes, fshtypes } from 'fsh-sushi';
import { ProcessableElementDefinition } from '../processor';
import { ExportableFixedValueRule } from '../exportable';
import { getPath } from '../utils';
import { fshifyString } from '../exportable/common';

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
      const fixedValueRule = new ExportableFixedValueRule(getPath(input));
      if (matchingKey.startsWith('fixed')) {
        fixedValueRule.exactly = true;
      }
      if (isPrimitiveValue(matchingValue)) {
        // a primitive string could represent a string value or a code value
        if (typeof matchingValue === 'string') {
          if (matchingKey.endsWith('Code')) {
            fixedValueRule.fixedValue = new fshtypes.FshCode(matchingValue);
          } else {
            fixedValueRule.fixedValue = fshifyString(matchingValue);
          }
        } else {
          fixedValueRule.fixedValue = matchingValue;
        }
        input.processedPaths.push(matchingKey);
        return fixedValueRule;
      } else {
        if (matchingKey.endsWith('Coding') && isCoding(matchingValue)) {
          fixedValueRule.fixedValue = new fshtypes.FshCode(
            matchingValue.code,
            matchingValue.system,
            matchingValue.display ? fshifyString(matchingValue.display) : undefined
          );
          input.processedPaths.push(
            `${matchingKey}.code`,
            `${matchingKey}.system`,
            `${matchingKey}.display`
          );
          return fixedValueRule;
        } else if (matchingKey.endsWith('CodeableConcept') && isCodeableConcept(matchingValue)) {
          fixedValueRule.fixedValue = new fshtypes.FshCode(
            matchingValue.coding[0].code,
            matchingValue.coding[0].system,
            matchingValue.coding[0].display
              ? fshifyString(matchingValue.coding[0].display)
              : undefined
          );
          input.processedPaths.push(
            `${matchingKey}.coding[0].code`,
            `${matchingKey}.coding[0].system`,
            `${matchingKey}.coding[0].display`
          );
          return fixedValueRule;
        } else if (matchingKey.endsWith('Quantity') && isQuantity(matchingValue)) {
          const unit = new fshtypes.FshCode(
            matchingValue.code,
            matchingValue.system,
            matchingValue.unit
          );
          fixedValueRule.fixedValue = new fshtypes.FshQuantity(matchingValue.value, unit);
          input.processedPaths.push(
            `${matchingKey}.value`,
            `${matchingKey}.code`,
            `${matchingKey}.system`,
            `${matchingKey}.unit`
          );
          return fixedValueRule;
        } else if (matchingKey.endsWith('Ratio') && isRatio(matchingValue)) {
          const numeratorUnits = new fshtypes.FshCode(
            matchingValue.numerator.code,
            matchingValue.numerator.system,
            matchingValue.numerator.unit
          );
          const denominatorUnits = new fshtypes.FshCode(
            matchingValue.denominator.code,
            matchingValue.denominator.system,
            matchingValue.denominator.unit
          );
          fixedValueRule.fixedValue = new fshtypes.FshRatio(
            new fshtypes.FshQuantity(matchingValue.numerator.value, numeratorUnits),
            new fshtypes.FshQuantity(matchingValue.denominator.value, denominatorUnits)
          );
          input.processedPaths.push(
            `${matchingKey}.numerator.value`,
            `${matchingKey}.numerator.code`,
            `${matchingKey}.numerator.system`,
            `${matchingKey}.numerator.unit`,
            `${matchingKey}.denominator.value`,
            `${matchingKey}.denominator.code`,
            `${matchingKey}.denominator.system`,
            `${matchingKey}.denominator.unit`
          );
          return fixedValueRule;
        } else if (matchingKey.endsWith('Reference') && isReference(matchingValue)) {
          fixedValueRule.fixedValue = new fshtypes.FshReference(
            matchingValue.reference,
            matchingValue.display ? fshifyString(matchingValue.display) : undefined
          );
          input.processedPaths.push(`${matchingKey}.reference`, `${matchingKey}.display`);
          return fixedValueRule;
        } else {
          // NOTE: temporarily disabling this block until Instances are properly supported
          // TODO: properly support instances and re-enable this block
          // fixedValueRule.isInstance = true;
          // fixedValueRule.fixedValue = new fhirtypes.InstanceDefinition();
          // fixedValueRule.fixedValue.resourceType = matchingKey.replace(/^fixed|pattern/, '');
          // Object.assign(fixedValueRule.fixedValue, cloneDeep(matchingValue));
          // const flatValue = getPathValuePairs(matchingValue);
          // input.processedPaths.push(...Object.keys(flatValue).map(k => `${matchingKey}.${k}`));
          // return fixedValueRule;
        }
      }
    }
    return null;
  }
}

type primitiveValueTypes = number | string | boolean;

function isPrimitiveValue(value: any): value is primitiveValueTypes {
  return typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number';
}

function isCoding(value: any): value is fhirtypes.Coding {
  return 'code' in value;
}

function isCodeableConcept(value: any): value is fhirtypes.CodeableConcept {
  return 'coding' in value && value.coding?.length > 0 && isCoding(value.coding[0]);
}

function isQuantity(value: any): value is fhirtypes.Quantity {
  return 'value' in value && 'code' in value;
}

function isRatio(value: any): value is fhirtypes.Ratio {
  return (
    'numerator' in value &&
    'denominator' in value &&
    isQuantity(value.numerator) &&
    isQuantity(value.denominator)
  );
}

// A FixedValueRule for a Reference needs the 'reference' element.
// Some References won't have that, and they will be handled with other rules.
function isReference(value: any): value is fhirtypes.Reference {
  return 'reference' in value;
}
