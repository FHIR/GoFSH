import { EOL } from 'os';
import { FshCodeSystem } from 'fsh-sushi/dist/fshtypes';
import { ConceptRule } from 'fsh-sushi/dist/fshtypes/rules';
import { fshifyString } from '../utils';

export class CodeSystemExporter {
  exportKeywords(input: FshCodeSystem): string[] {
    const resultLines = [`CodeSystem: ${input.name}`];
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

  exportRules(input: FshCodeSystem): string[] {
    const resultLines: string[] = [];
    for (const rule of input.rules) {
      if (rule instanceof ConceptRule) {
        let line = `* #${rule.code}`;
        if (rule.display) {
          line += ` "${fshifyString(rule.display)}"`;
        }
        if (rule.definition) {
          // If there is no display, a definition must be specified with triple quotes
          // so that it is correctly differentiated from a display by sushi
          const quotes = rule.display ? '"' : '"""';
          line += ` ${quotes}${fshifyString(rule.definition)}${quotes}`;
        }
        resultLines.push(line);
      }
    }
    return resultLines;
  }

  export(input: FshCodeSystem): string {
    const resultLines = this.exportKeywords(input);
    resultLines.push(...this.exportRules(input));
    return resultLines.join(EOL);
  }
}
