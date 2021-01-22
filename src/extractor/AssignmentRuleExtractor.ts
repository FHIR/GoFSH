import { fhirtypes, fshtypes } from 'fsh-sushi';
import { ProcessableElementDefinition } from '../processor';
import { ExportableAssignmentRule } from '../exportable';
import { getPath } from '../utils';
import { fshifyString } from '../exportable/common';

export class AssignmentRuleExtractor {
  static process(input: ProcessableElementDefinition): ExportableAssignmentRule[] {
    // check for fixedSomething or patternSomething
    // pattern and fixed are mutually exclusive
    // these are on one-type elements, so if our SD has value[x],
    // this element might be something like valueString
    const matchingKey = Object.keys(input).find(
      key => key.startsWith('fixed') || key.startsWith('pattern')
    );
    if (matchingKey) {
      const matchingValue = input[matchingKey as keyof fhirtypes.ElementDefinition];
      const assignmentRule = new ExportableAssignmentRule(getPath(input));
      if (matchingKey.startsWith('fixed')) {
        assignmentRule.exactly = true;
      }
      if (isPrimitiveValue(matchingValue)) {
        // a primitive string could represent a string value or a code value
        if (typeof matchingValue === 'string') {
          if (matchingKey.endsWith('Code')) {
            assignmentRule.value = new fshtypes.FshCode(matchingValue);
          } else {
            assignmentRule.value = fshifyString(matchingValue);
          }
        } else {
          assignmentRule.value = matchingValue;
        }
        input.processedPaths.push(matchingKey);
        return [assignmentRule];
      } else {
        if (matchingKey.endsWith('Coding') && isCoding(matchingValue)) {
          assignmentRule.value = new fshtypes.FshCode(
            matchingValue.code,
            matchingValue.system,
            matchingValue.display ? fshifyString(matchingValue.display) : undefined
          );
          input.processedPaths.push(
            `${matchingKey}.code`,
            `${matchingKey}.system`,
            `${matchingKey}.display`
          );
          return [assignmentRule];
        } else if (matchingKey.endsWith('CodeableConcept') && isCodeableConcept(matchingValue)) {
          assignmentRule.value = new fshtypes.FshCode(
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
          return [assignmentRule];
        } else if (matchingKey.endsWith('Quantity') && isQuantity(matchingValue)) {
          const unit = new fshtypes.FshCode(
            matchingValue.code,
            matchingValue.system,
            matchingValue.unit
          );
          input.processedPaths.push(
            `${matchingKey}.value`,
            `${matchingKey}.code`,
            `${matchingKey}.system`,
            `${matchingKey}.unit`
          );
          // if system is http://unitsofmeasure.org, we can build a FshQuantity.
          // otherwise, multiple assignments will be necessary.
          if (matchingValue.system === 'http://unitsofmeasure.org') {
            assignmentRule.value = new fshtypes.FshQuantity(matchingValue.value, unit);
            return [assignmentRule];
          } else {
            assignmentRule.value = unit;
            const valueRule = new ExportableAssignmentRule(`${assignmentRule.path}.value`);
            valueRule.value = matchingValue.value;
            return [assignmentRule, valueRule];
          }
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
          // if system is http://unitsofmeasure.org for both numerator and denominator, we can build a FshRatio.
          // otherwise, multiple assignments will be necessary.
          if (
            matchingValue.numerator.system === 'http://unitsofmeasure.org' &&
            matchingValue.denominator.system === 'http://unitsofmeasure.org'
          ) {
            assignmentRule.value = new fshtypes.FshRatio(
              new fshtypes.FshQuantity(matchingValue.numerator.value, numeratorUnits),
              new fshtypes.FshQuantity(matchingValue.denominator.value, denominatorUnits)
            );
            return [assignmentRule];
          } else {
            const composedRules: ExportableAssignmentRule[] = [];
            if (matchingValue.numerator.system === 'http://unitsofmeasure.org') {
              const numeratorRule = new ExportableAssignmentRule(
                `${assignmentRule.path}.numerator`
              );
              numeratorRule.value = new fshtypes.FshQuantity(
                matchingValue.numerator.value,
                numeratorUnits
              );
              composedRules.push(numeratorRule);
            } else {
              const numeratorQuantityRule = new ExportableAssignmentRule(
                `${assignmentRule.path}.numerator`
              );
              numeratorQuantityRule.value = numeratorUnits;
              const numeratorValueRule = new ExportableAssignmentRule(
                `${assignmentRule.path}.numerator.value`
              );
              numeratorValueRule.value = matchingValue.numerator.value;
              composedRules.push(numeratorQuantityRule, numeratorValueRule);
            }
            if (matchingValue.denominator.system === 'http://unitsofmeasure.org') {
              const denominatorRule = new ExportableAssignmentRule(
                `${assignmentRule.path}.denominator`
              );
              denominatorRule.value = new fshtypes.FshQuantity(
                matchingValue.denominator.value,
                denominatorUnits
              );
              composedRules.push(denominatorRule);
            } else {
              const denominatorQuantityRule = new ExportableAssignmentRule(
                `${assignmentRule.path}.denominator`
              );
              denominatorQuantityRule.value = denominatorUnits;
              const denominatorValueRule = new ExportableAssignmentRule(
                `${assignmentRule.path}.denominator.value`
              );
              denominatorValueRule.value = matchingValue.denominator.value;
              composedRules.push(denominatorQuantityRule, denominatorValueRule);
            }
            return composedRules;
          }
        } else if (matchingKey.endsWith('Reference') && isReference(matchingValue)) {
          assignmentRule.value = new fshtypes.FshReference(
            matchingValue.reference,
            matchingValue.display ? fshifyString(matchingValue.display) : undefined
          );
          input.processedPaths.push(`${matchingKey}.reference`, `${matchingKey}.display`);
          return [assignmentRule];
        } else {
          // NOTE: temporarily disabling this block until Instances are properly supported
          // TODO: properly support instances and re-enable this block
          // assignmentRule.isInstance = true;
          // assignmentRule.value = new fhirtypes.InstanceDefinition();
          // assignmentRule.value.resourceType = matchingKey.replace(/^fixed|pattern/, '');
          // Object.assign(assignmentRule.value, cloneDeep(matchingValue));
          // const flatValue = getPathValuePairs(matchingValue);
          // input.processedPaths.push(...Object.keys(flatValue).map(k => `${matchingKey}.${k}`));
          // return assignmentRule;
        }
      }
    }
    return [];
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

// An AssignmentRule for a Reference needs the 'reference' element.
// Some References won't have that, and they will be handled with other rules.
function isReference(value: any): value is fhirtypes.Reference {
  return 'reference' in value;
}
