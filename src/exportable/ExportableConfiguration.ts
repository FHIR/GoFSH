import YAML from 'yaml';
import { fshtypes } from 'fsh-sushi';
import { Exportable } from '.';

export class ExportableConfiguration implements Exportable {
  constructor(public config: fshtypes.Configuration) {}

  toFSH(): string {
    // canonical and fhirVersion are always present
    const yaml = new YAML.Document();
    yaml.contents = YAML.createNode({
      canonical: this.config.canonical,
      fhirVersion: this.config.fhirVersion?.[0] ?? '4.0.1'
    });
    if (this.config.id) {
      yaml.contents.add({ key: 'id', value: this.config.id });
    }

    return yaml.toString();
  }
}
