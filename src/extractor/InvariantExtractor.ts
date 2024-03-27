import { fshtypes, utils } from 'fsh-sushi';
import { cloneDeep, isEqual, toPairs } from 'lodash';
import { ExportableInvariant } from '../exportable/ExportableInvariant';
import {
  ProcessableElementDefinition,
  ProcessableStructureDefinition,
  switchQuantityRules
} from '../processor';
import { getFSHValue, getPath, getPathValuePairs, isFSHValueEmpty } from '../utils';
import { ExportableAssignmentRule } from '../exportable';

export class InvariantExtractor {
  static process(
    input: ProcessableElementDefinition,
    structDef: ProcessableStructureDefinition,
    existingInvariants: ExportableInvariant[],
    fisher: utils.Fishable
  ): ExportableInvariant[] {
    const invariants: ExportableInvariant[] = [];
    if (input.constraint?.length > 0) {
      input.constraint.forEach((constraint, i) => {
        // clone the constraint so we can take it apart as we work with it
        const workingConstraint = cloneDeep(constraint);
        const constraintPaths: string[] = [];
        // required: key, human, severity
        const invariant = new ExportableInvariant(workingConstraint.key);
        invariant.description = workingConstraint.human;
        invariant.severity = new fshtypes.FshCode(workingConstraint.severity);
        constraintPaths.push(
          `constraint[${i}].key`,
          `constraint[${i}].human`,
          `constraint[${i}].severity`
        );
        delete workingConstraint.key;
        delete workingConstraint.human;
        delete workingConstraint.severity;
        // optional: expression, xpath
        if (workingConstraint.expression) {
          invariant.expression = workingConstraint.expression;
          constraintPaths.push(`constraint[${i}].expression`);
          delete workingConstraint.expression;
        }
        if (workingConstraint.xpath) {
          invariant.xpath = workingConstraint.xpath;
          constraintPaths.push(`constraint[${i}].xpath`);
          delete workingConstraint.xpath;
        }
        // SUSHI autopopulates source to the current SD URL, so as long as it matches, mark that path as processed
        if (workingConstraint.source == null || workingConstraint.source === structDef.url) {
          constraintPaths.push(`constraint[${i}].source`);
          delete workingConstraint.source;
        }
        // other properties are created with rules on the invariant
        // since we're already inside the ElementDefinition, we have to manually prepend "constraint" to the path
        // so that we can get the FSH value correctly.
        // but, we want the original path for the rule itself.
        const flatPropertyArray = toPairs(
          getPathValuePairs(workingConstraint, x => `constraint[${i}].${x}`)
        );
        const elementPath = getPath(input);
        const entityPath =
          elementPath === '.' ? structDef.name : `${structDef.name}.${elementPath}`;
        flatPropertyArray.forEach(([path], propertyIdx) => {
          const originalPath = path.replace(`constraint[${i}].`, '');
          const assignmentRule = new ExportableAssignmentRule(originalPath);
          assignmentRule.value = getFSHValue(
            propertyIdx,
            flatPropertyArray,
            'ElementDefinition',
            entityPath,
            fisher
          );
          if (!isFSHValueEmpty(assignmentRule.value)) {
            invariant.rules.push(assignmentRule);
          }
          constraintPaths.push(path);
        });
        switchQuantityRules(invariant.rules);

        // if an invariant with this key already exists, don't make a new invariant with the same key.
        // if the new invariant would be an exact match of the existing invariant, mark the paths as
        // processed so an ObeysRule is created and no CaretValueRules are created.
        // if the new invariant has a key match but isn't an exact match, it will be created using CaretValueRules.
        const matchingKeyInvariant = [...existingInvariants, ...invariants].find(
          inv => inv.name === invariant.name
        );
        if (matchingKeyInvariant) {
          if (isEqual(matchingKeyInvariant, invariant)) {
            input.processedPaths.push(...constraintPaths);
          }
        } else {
          input.processedPaths.push(...constraintPaths);
          invariants.push(invariant);
        }
      });
    }
    return invariants;
  }
}
