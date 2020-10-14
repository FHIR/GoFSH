import { fshtypes } from 'fsh-sushi';
import { Exportable } from '.';
import { metadataToFSH } from './common';

export class ExportableInvariant extends fshtypes.Invariant implements Exportable {
  constructor(name: string) {
    super(name);
  }

  toFSH(): string {
    return metadataToFSH(this);
  }
}
