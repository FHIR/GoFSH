import { EOL } from 'os';
import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableSdRule, ExportableAddElementRule } from '.';

export class ExportableResource extends fshtypes.Resource implements Exportable {
  rules: (ExportableSdRule | ExportableAddElementRule)[];

  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    // Omit the Parent keyword when the default Parent is used
    let fsh = super.toFSH();
    if (
      this.parent === 'DomainResource' ||
      this.parent === 'http://hl7.org/fhir/StructureDefinition/DomainResource'
    ) {
      fsh = fsh.replace(`${EOL}Parent: ${this.parent}`, '');
    }
    return fsh;
  }
}
