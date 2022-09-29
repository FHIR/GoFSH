import { pullAt } from 'lodash';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableSdRule,
  ExportableAddElementRule,
  ExportableProfile,
  ExportableExtension,
  ExportableValueSet,
  ExportableCodeSystem,
  ExportableLogical,
  ExportableResource
} from '../exportable';
import { logger } from '../utils';

// Places general Quantity-setting rules ahead of Quantity.unit setting rules
export function switchQuantityRules(rules: (ExportableSdRule | ExportableAddElementRule)[]): void {
  let unitIndex: number;
  let lastSiblingIndex: number;
  let basePath: string;
  let siblingPaths: string[];
  rules.forEach((rule, index) => {
    if (!(rule instanceof ExportableAssignmentRule || rule instanceof ExportableCaretValueRule)) {
      return;
    }
    const operativePath = rule instanceof ExportableCaretValueRule ? rule.caretPath : rule.path;
    if (operativePath.endsWith('.unit')) {
      unitIndex = index;
      basePath = operativePath.replace(/\.unit$/, '');
      siblingPaths = [`${basePath}.system`, `${basePath}.code`, `${basePath}.value`, basePath];
    } else {
      if (siblingPaths?.includes(operativePath)) {
        lastSiblingIndex = index;
        if (lastSiblingIndex > unitIndex) {
          rules.splice(unitIndex, 0, rule);
          pullAt(rules, [index + 1]);
        }
      }
    }
  });
}

export function makeNameSushiSafe(
  entity:
    | ExportableProfile
    | ExportableExtension
    | ExportableLogical
    | ExportableResource
    | ExportableValueSet
    | ExportableCodeSystem
) {
  if (/\s/.test(entity.name)) {
    const fixedEntityName = entity.name.replace(/\s/g, '_');
    let entityType: string;
    if (entity instanceof ExportableValueSet) {
      entityType = 'ValueSet';
    } else if (entity instanceof ExportableCodeSystem) {
      entityType = 'CodeSystem';
    } else {
      entityType = 'StructureDefinition';
    }
    logger.warn(
      `${entityType} with id ${entity.id} has name with whitespace (${entity.name}). Converting whitespace to underscores (${fixedEntityName}).`
    );
    const nameRule = new ExportableCaretValueRule('');
    nameRule.caretPath = 'name';
    nameRule.value = entity.name;
    entity.name = fixedEntityName;
    entity.rules.unshift(nameRule);
  }
}
