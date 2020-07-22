import { EOL } from 'os';
import { Extension } from 'fsh-sushi/dist/fshtypes';
import { AbstractSDExporter } from './AbstractSDExporter';

// TODO: ProfileExporter and ExtensionExporter may not be sufficiently different to justify
// having different classes. For now they're separate but we may want to combine them.
export class ExtensionExporter extends AbstractSDExporter {
  export(input: Extension): string {
    const resultLines = this.exportKeywords(input);
    resultLines.push(...this.exportRules(input));
    return resultLines.join(EOL);
  }
}
