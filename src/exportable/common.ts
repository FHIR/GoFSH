import { EOL } from 'os';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableCodeSystem,
  ExportableValueSet,
  ExportableInvariant,
  ExportableMapping,
  ExportableInstance
} from '.';

export function metadataToFSH(
  definition:
    | ExportableProfile
    | ExportableExtension
    | ExportableCodeSystem
    | ExportableValueSet
    | ExportableInvariant
    | ExportableMapping
    | ExportableInstance
): string {
  const resultLines: string[] = [];
  if (definition instanceof ExportableProfile) {
    resultLines.push(`Profile: ${definition.name}`);
    // Technically, every profile has a parent, but for ease of use in testing, some might not
    if (definition.parent) {
      resultLines.push(`Parent: ${definition.parent}`);
    }
  } else if (definition instanceof ExportableExtension) {
    resultLines.push(`Extension: ${definition.name}`);
    if (
      definition.parent != 'Extension' &&
      definition.parent != 'http://hl7.org/fhir/StructureDefinition/Extension'
    ) {
      resultLines.push(`Parent: ${definition.parent}`);
    }
  } else if (definition instanceof ExportableCodeSystem) {
    resultLines.push(`CodeSystem: ${definition.name}`);
  } else if (definition instanceof ExportableValueSet) {
    resultLines.push(`ValueSet: ${definition.name}`);
  } else if (definition instanceof ExportableInvariant) {
    resultLines.push(`Invariant: ${definition.name}`);
  } else if (definition instanceof ExportableMapping) {
    resultLines.push(`Mapping: ${definition.name}`);
  } else if (definition instanceof ExportableInstance) {
    resultLines.push(`Instance: ${definition.name}`);
    resultLines.push(`InstanceOf: ${definition.instanceOf}`);
  }

  // Invariants and Instances don't use the "Id" keyword
  if (!(definition instanceof ExportableInvariant || definition instanceof ExportableInstance)) {
    if (definition.id) {
      resultLines.push(`Id: ${definition.id}`);
    }
  }
  // Invariants don't use the "Title" keyword
  if (!(definition instanceof ExportableInvariant)) {
    if (definition.title) {
      resultLines.push(`Title: "${fshifyString(definition.title)}"`);
    }
  }
  if (definition.description) {
    // Description can be a multiline string.
    // If it contains newline characters, treat it as a multiline string.
    if (definition.description.indexOf('\n') > -1) {
      resultLines.push(`Description: """${definition.description}"""`);
    } else {
      resultLines.push(`Description: "${fshifyString(definition.description)}"`);
    }
  }
  if (definition instanceof ExportableInvariant) {
    if (definition.severity) {
      resultLines.push(`Severity: ${definition.severity}`);
    }
    if (definition.expression) {
      resultLines.push(`Expression: "${fshifyString(definition.expression)}"`);
    }
    if (definition.xpath) {
      resultLines.push(`XPath: "${fshifyString(definition.xpath)}"`);
    }
  }
  if (definition instanceof ExportableMapping) {
    if (definition.source) {
      resultLines.push(`Source: ${definition.source}`);
    }
    if (definition.target) {
      resultLines.push(`Target: "${fshifyString(definition.target)}"`);
    }
  }
  if (definition instanceof ExportableInstance) {
    if (definition.usage) {
      resultLines.push(`Usage: #${definition.usage.toLowerCase()}`);
    }
  }
  return resultLines.join(EOL);
}

// Adds expected backslash-escapes to a string to make it a FSH string
export function fshifyString(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// Places general Quantity-setting rules ahead of Quantity.unit setting rules
export function switchQuantityRules(
  resource: ExportableExtension | ExportableProfile | ExportableInstance
): void {
  const seenRules = new Map();
  resource.rules.forEach((rule, index) => {
    if (!seenRules.has(rule.path)) seenRules.set(rule.path, index);
    const unitRulePath = rule.path.concat('.unit');
    if (seenRules.has(unitRulePath)) {
      const unitRuleIndex = seenRules.get(unitRulePath);
      resource.rules.splice(unitRuleIndex, 0, rule);
      delete resource.rules[index + 1];
    }
  });
}

// Removes the underscore on paths of children of primitive elements
export function removeUnderscoreForPrimitiveChildPath(input: string): string {
  return input
    .split('.')
    .map(p => p.replace(/^_/, ''))
    .join('.');
}
