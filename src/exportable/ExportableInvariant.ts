import { fshtypes } from 'fsh-sushi';
import { Exportable } from '.';

export class ExportableInvariant extends fshtypes.Invariant implements Exportable {
  constructor(name: string) {
    super(name);
  }
}
