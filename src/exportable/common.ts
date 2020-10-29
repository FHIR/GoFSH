import { EOL } from 'os';
import {
  ExportableProfile,
  ExportableExtension,
  ExportableCodeSystem,
  ExportableValueSet,
  ExportableInvariant,
  ExportableMapping
} from '.';

export function metadataToFSH(
  definition:
    | ExportableProfile
    | ExportableExtension
    | ExportableCodeSystem
    | ExportableValueSet
    | ExportableInvariant
    | ExportableMapping
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
  }

  // Invariants do not use the Id and Title keywords
  if (!(definition instanceof ExportableInvariant)) {
    if (definition.id) {
      resultLines.push(`Id: ${definition.id}`);
    }
    if (definition.title) {
      resultLines.push(`Title: "${fshifyString(definition.title)}"`);
    }
  }
  if (definition.description) {
    resultLines.push(`Description: "${fshifyString(definition.description)}"`);
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
