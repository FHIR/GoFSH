import { fhirtypes, fshtypes } from 'fsh-sushi';
import { ProcessableElementDefinition } from '../processor';
import { ExportableAssignmentRule } from '../exportable';
import { dateRegex, dateTimeRegex, getPath, instantRegex, timeRegex, logger } from '../utils';
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
        // a primitive string could represent a string value, code value, or integer64 value
        if (typeof matchingValue === 'string') {
          if (matchingKey.endsWith('Code')) {
            assignmentRule.value = new fshtypes.FshCode(matchingValue);
          } else if (matchingKey.endsWith('Integer64')) {
            assignmentRule.value = BigInt(matchingValue);
          } else {
            assignmentRule.value = matchingValue;
            if (matchingKey.endsWith('DateTime')) {
              if (!dateTimeRegex.test(matchingValue)) {
                logger.warn(
                  `Value ${matchingValue} on element ${assignmentRule.path} is not a valid FHIR dateTime`
                );
              }
            } else if (matchingKey.endsWith('Date')) {
              if (!dateRegex.test(matchingValue)) {
                logger.warn(
                  `Value ${matchingValue} on element ${assignmentRule.path} is not a valid FHIR date`
                );
              }
            } else if (matchingKey.endsWith('Time')) {
              if (!timeRegex.test(matchingValue)) {
                logger.warn(
                  `Value ${matchingValue} on element ${assignmentRule.path} is not a valid FHIR time`
                );
              }
            } else if (matchingKey.endsWith('Instant')) {
              if (!instantRegex.test(matchingValue)) {
                logger.warn(
                  `Value ${matchingValue} on element ${assignmentRule.path} is not a valid FHIR instant`
                );
              }
            }
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
        } else if (matchingKey.endsWith('Quantity')) {
          return AssignmentRuleExtractor.buildRulesForQuantity(
            assignmentRule,
            input,
            matchingKey,
            matchingValue
          );
        } else if (matchingKey.endsWith('Ratio')) {
          let numeratorRules: ExportableAssignmentRule[];
          let denominatorRules: ExportableAssignmentRule[];
          if ('numerator' in matchingValue) {
            const startingNumerator = new ExportableAssignmentRule(
              `${assignmentRule.path}.numerator`
            );
            startingNumerator.exactly = assignmentRule.exactly;
            numeratorRules = AssignmentRuleExtractor.buildRulesForQuantity(
              startingNumerator,
              input,
              `${matchingKey}.numerator`,
              matchingValue.numerator
            );
          }
          if ('denominator' in matchingValue) {
            const startingDenominator = new ExportableAssignmentRule(
              `${assignmentRule.path}.denominator`
            );
            startingDenominator.exactly = assignmentRule.exactly;
            denominatorRules = AssignmentRuleExtractor.buildRulesForQuantity(
              startingDenominator,
              input,
              `${matchingKey}.denominator`,
              matchingValue.denominator
            );
          }
          // if numerator and denominator are representable by a single quantity,
          // we can combine them into a ratio.
          // otherwise, return both rule lists concatenated together.
          if (
            numeratorRules.length === 1 &&
            numeratorRules[0].value instanceof fshtypes.FshQuantity &&
            denominatorRules.length === 1 &&
            denominatorRules[0].value instanceof fshtypes.FshQuantity
          ) {
            assignmentRule.value = new fshtypes.FshRatio(
              numeratorRules[0].value,
              denominatorRules[0].value
            );
            return [assignmentRule];
          } else {
            return [...numeratorRules, ...denominatorRules];
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

  private static buildRulesForQuantity(
    assignmentRule: ExportableAssignmentRule,
    input: ProcessableElementDefinition,
    matchingKey: string,
    matchingValue: any
  ): ExportableAssignmentRule[] {
    if (isQuantity(matchingValue)) {
      input.processedPaths.push(
        `${matchingKey}.value`,
        `${matchingKey}.code`,
        `${matchingKey}.system`,
        `${matchingKey}.unit`
      );
      const unit = new fshtypes.FshCode(
        matchingValue.code,
        matchingValue.system,
        matchingValue.unit
      );
      assignmentRule.value = new fshtypes.FshQuantity(matchingValue.value, unit);
      return [assignmentRule];
    } else {
      // we have something on patternQuantity that isn't expressible as a FshQuantity.
      // that's okay! we can still do good things here with whatever we have.
      // if we have a code, we can at least make a FshCode.
      // if we don't have a code, these will have to become caret rules.
      if ('code' in matchingValue) {
        input.processedPaths.push(
          `${matchingKey}.value`,
          `${matchingKey}.code`,
          `${matchingKey}.system`,
          `${matchingKey}.unit`
        );
        assignmentRule.value = new fshtypes.FshCode(
          matchingValue.code,
          matchingValue.system,
          'unit' in matchingValue ? matchingValue.unit : undefined
        );
        return [assignmentRule];
      } else {
        return [];
      }
    }
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

// An AssignmentRule for a Reference needs the 'reference' element.
// Some References won't have that, and they will be handled with other rules.
function isReference(value: any): value is fhirtypes.Reference {
  return 'reference' in value;
}
