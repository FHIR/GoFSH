import { Exportable } from '.';

export class ExportableAlias implements Exportable {
  alias: string;
  url: string;

  constructor(alias: string, url: string) {
    this.alias = alias;
    this.url = url;
  }

  toFSH(): string {
    return `Alias: ${this.alias} = ${this.url}`;
  }
}
