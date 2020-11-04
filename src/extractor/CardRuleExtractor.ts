import { utils } from 'fsh-sushi';
import { ProcessableStructureDefinition, ProcessableElementDefinition } from '../processor';
import { ExportableCardRule } from '../exportable';
import { getPath } from '../utils';

export class CardRuleExtractor {
  static process(
    input: ProcessableElementDefinition,
    structDef: ProcessableStructureDefinition,
    fisher: utils.Fishable,
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
      // SUSHI will automatically create a card rule if all of the following is true:
      // - this is a sliced element
      // - there is a cardinality rule on at least one of the slices
      // - the min on this element matches the sum of the mins on all slices
      // If we reach this condition, don't output a card min since SUSHI will do it.
      // Technically this is an optimization, but the optimizations don't have access to
      // the full SD, and we need the full SD to get the sum of all slices (including
      // inherited slices)
      if (
        removeInferredSlicedMin &&
        hasSlicesWithConstrainedCards(input, structDef) &&
        isSliced(input, structDef, fisher)
      ) {
        const sumOfMins = getSumOfSliceMins(input, structDef, fisher);
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

function hasSlicesWithConstrainedCards(
  input: ProcessableElementDefinition,
  structDef: ProcessableStructureDefinition
): boolean {
  return structDef?.differential?.element?.some(
    el =>
      el.path == input.path &&
      el.id != input.id &&
      el.sliceName != null &&
      (el.min != null || el.max != null)
  );
}

function isSliced(
  input: ProcessableElementDefinition,
  structDef: ProcessableStructureDefinition,
  fisher: utils.Fishable
): boolean {
  for (
    let currentStructDef = structDef;
    currentStructDef != null;
    currentStructDef = fisher.fishForFHIR(currentStructDef.baseDefinition)
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
  fisher: utils.Fishable
): number {
  let sum = 0;
  const countedSlices = new Set<string>();
  for (
    let currentStructDef = structDef;
    currentStructDef != null;
    currentStructDef = fisher.fishForFHIR(currentStructDef.baseDefinition)
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
