import { EOL } from 'os';
import { ExportableProfile, ExportableExtension, ExportableCodeSystem } from '.';

export function metadataToFSH(
  definition: ExportableProfile | ExportableExtension | ExportableCodeSystem
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
    if (definition.parent != 'Extension') {
      resultLines.push(`Parent: ${definition.parent}`);
    }
  } else if (definition instanceof ExportableCodeSystem) {
    resultLines.push(`CodeSystem: ${definition.name}`);
  }

  if (definition.id) {
    resultLines.push(`Id: ${definition.id}`);
  }
  if (definition.title) {
    resultLines.push(`Title: "${fshifyString(definition.title)}"`);
  }
  if (definition.description) {
    resultLines.push(`Description: "${fshifyString(definition.description)}"`);
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
