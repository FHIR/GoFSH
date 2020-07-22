import { Profile, Extension } from 'fsh-sushi/dist/fshtypes';
import { CardRule } from 'fsh-sushi/dist/fshtypes/rules';

export class AbstractSDExporter {
  exportKeywords(input: Profile | Extension): string[] {
    const type = input instanceof Profile ? 'Profile' : 'Extension';
    const resultLines = [`${type}: ${input.name}`];
    // Don't export parent if the type is "Extension" and the parent is "Extension"
    if (input.parent && input.parent !== type) {
      resultLines.push(`Parent: ${input.parent}`);
    }
    if (input.id) {
      resultLines.push(`Id: ${input.id}`);
    }
    if (input.title) {
      resultLines.push(`Title: "${fshifyString(input.title)}"`);
    }
    if (input.description) {
      resultLines.push(`Description: "${fshifyString(input.description)}"`);
    }
    return resultLines;
  }

  exportRules(input: Profile | Extension): string[] {
    const resultLines: string[] = [];
    for (const rule of input.rules) {
      if (rule instanceof CardRule) {
        resultLines.push(`* ${rule.path} ${rule.min ?? ''}..${rule.max ?? ''}`);
      }
    }
    return resultLines;
  }
}

// Adds expected backslash-escapes to a string to make it a FSH string
function fshifyString(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
