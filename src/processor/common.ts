import { pullAt } from 'lodash';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableSdRule,
  ExportableProfile,
  ExportableExtension,
  ExportableValueSet,
  ExportableCodeSystem
} from '../exportable';
import { logger } from '../utils';

// Places general Quantity-setting rules ahead of Quantity.unit setting rules
export function switchQuantityRules(rules: ExportableSdRule[]): void {
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
  entity: ExportableProfile | ExportableExtension | ExportableValueSet | ExportableCodeSystem
) {
  if (/\s/.test(entity.name)) {
    let entityType: string;
    if (entity instanceof ExportableProfile || entity instanceof ExportableExtension) {
      entityType = 'StructureDefinition';
    } else if (entity instanceof ExportableValueSet) {
      entityType = 'ValueSet';
    } else {
      entityType = 'CodeSystem';
    }
    logger.warn(
      `${entityType} with id ${entity.id} has name with whitespace. Converting whitespace to underscores.`
    );
    const nameRule = new ExportableCaretValueRule('');
    nameRule.caretPath = 'name';
    nameRule.value = entity.name;
    entity.name = entity.name.replace(/\s/g, '_');
    entity.rules.unshift(nameRule);
  }
}
