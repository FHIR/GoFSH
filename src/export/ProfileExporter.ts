import { Profile } from 'fsh-sushi/dist/fshtypes';
import { EOL } from 'os';

export class ProfileExporter {
  export(input: Profile): string {
    const resultLines = [`Profile: ${input.name}`];
    if (input.parent) {
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
    return resultLines.join(EOL);
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
