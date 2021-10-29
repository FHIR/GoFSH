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

  static fromFSH(fshLine: string): ExportableAlias {
    const regex = /^Alias:\s+(?<alias>\S+)\s+=\s+(?<url>\S+).*/;
    const match = regex.exec(fshLine);
    if (match != null) {
      return new ExportableAlias(match.groups.alias, match.groups.url);
    }
    return null;
  }
}
