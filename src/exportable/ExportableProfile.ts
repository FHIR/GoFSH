import { fshtypes } from 'fsh-sushi';
import { Exportable, ExportableSdRule } from '.';

export class ExportableProfile extends fshtypes.Profile implements Exportable {
  rules: ExportableSdRule[];

  constructor(name: string) {
    super(name);
  }
}
