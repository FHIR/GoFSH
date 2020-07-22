import { EOL } from 'os';
import { Profile } from 'fsh-sushi/dist/fshtypes';
import { AbstractSDExporter } from './AbstractSDExporter';

export class ProfileExporter extends AbstractSDExporter {
  export(input: Profile): string {
    const resultLines = this.exportKeywords(input);
    resultLines.push(...this.exportRules(input));
    return resultLines.join(EOL);
  }
}
