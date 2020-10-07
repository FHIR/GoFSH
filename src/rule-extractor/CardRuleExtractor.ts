import { fhirdefs } from 'fsh-sushi';
import { ProcessableStructureDefinition, ProcessableElementDefinition } from '../processor';
import { ExportableCardRule } from '../exportable';
import { getPath } from '../utils';

export class CardRuleExtractor {
  static process(
    input: ProcessableElementDefinition,
    structDef: ProcessableStructureDefinition,
    fhir: fhirdefs.FHIRDefinitions,
    removeInferredSlicedMin = true
  ): ExportableCardRule | null {
    if (input.min || input.max) {
      const cardRule = new ExportableCardRule(getPath(input));
      if (input.min != null) {
        cardRule.min = input.min;
        input.processedPaths.push('min');
      }
      if (input.max != null) {
        cardRule.max = input.max;
        input.processedPaths.push('max');
      }
      // If this is a sliced element, and the min matches the sum of its slice's mins,
      // then don't output it -- because SUSHI will automatically apply this min value.
      // Technically this is an optimization, but the optimizations don't have access to
      // the full SD, and we need the full SD to get the sum of all slices (including
      // inherited slices)
      if (removeInferredSlicedMin && isSliced(input, structDef, fhir)) {
        const sumOfMins = getSumOfSliceMins(input, structDef, fhir);
        if (sumOfMins === input.min) {
          if (cardRule.max == null) {
            // No min or max, so return null card rule
            return null;
          }
          // has a max, so return cardRule without the min
          cardRule.min = undefined;
        }
      }
      return cardRule;
    } else {
      return null;
    }
  }
}

function isSliced(
  input: ProcessableElementDefinition,
  structDef: ProcessableStructureDefinition,
  fhir: fhirdefs.FHIRDefinitions
): boolean {
  for (
    let currentStructDef = structDef;
    currentStructDef != null;
    currentStructDef = fhir.fishForFHIR(currentStructDef.baseDefinition)
  ) {
    // If the element is in the snapshot, then presence or lack of slicing is conclusive
    const snapshotEl = currentStructDef.snapshot?.element?.find(el => el.id === input.id);
    if (snapshotEl) {
      return snapshotEl.slicing != null;
    } else {
      // The differential is only conclusive in the positive case, otherwise it could still be inherited from a parent
      const differentialEl = currentStructDef.differential?.element?.find(el => el.id === input.id);
      if (differentialEl?.slicing != null) {
        return true;
      }
    }
  }
  return false;
}

function getSumOfSliceMins(
  input: ProcessableElementDefinition,
  structDef: ProcessableStructureDefinition,
  fhir: fhirdefs.FHIRDefinitions
): number {
  let sum = 0;
  const countedSlices = new Set<string>();
  for (
    let currentStructDef = structDef;
    currentStructDef != null;
    currentStructDef = fhir.fishForFHIR(currentStructDef.baseDefinition)
  ) {
    const uncountedSlicesWithMins = (
      currentStructDef.snapshot ?? currentStructDef.differential
    )?.element?.filter(
      el =>
        el.path === input.path &&
        el.sliceName != null &&
        el.min != null &&
        !countedSlices.has(el.sliceName)
    );
    uncountedSlicesWithMins.forEach(slice => {
      sum += slice.min;
      countedSlices.add(slice.sliceName);
    });
    if (currentStructDef.snapshot != null) {
      break;
    }
  }

  return sum;
}
