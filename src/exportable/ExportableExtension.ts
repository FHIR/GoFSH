import { EOL } from 'os';
import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableSdRule } from '.';

export class ExportableExtension extends fshtypes.Extension implements Exportable {
  rules: ExportableSdRule[];

  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    // Omit the Parent keyword when the default Parent is used
    let fsh = super.toFSH();
    if (
      this.parent === 'Extension' ||
      this.parent === 'http://hl7.org/fhir/StructureDefinition/Extension'
    ) {
      fsh = fsh.replace(`${EOL}Parent: ${this.parent}`, '');
    }
    return fsh;
  }
}
