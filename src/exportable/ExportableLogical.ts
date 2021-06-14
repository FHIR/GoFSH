import { EOL } from 'os';
import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableSdRule, ExportableAddElementRule } from '.';

export class ExportableLogical extends fshtypes.Logical implements Exportable {
  rules: (ExportableSdRule | ExportableAddElementRule)[];

  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    // Omit the Parent keyword when the default Parent is used
    let fsh = super.toFSH();
    if (this.parent === 'Base' || this.parent === 'http://hl7.org/fhir/StructureDefinition/Base') {
      fsh = fsh.replace(`${EOL}Parent: ${this.parent}`, '');
    }
    return fsh;
  }
}
