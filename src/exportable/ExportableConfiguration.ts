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
      fhirVersion: this.config.fhirVersion[0]
    });
    // id, name, status, and version are the optional configuration properties.
    if (this.config.id) {
      yaml.contents.add({ key: 'id', value: this.config.id });
    }
    if (this.config.name) {
      yaml.contents.add({ key: 'name', value: this.config.name });
    }
    if (this.config.status) {
      yaml.contents.add({ key: 'status', value: this.config.status });
    }
    if (this.config.version) {
      yaml.contents.add({ key: 'version', value: this.config.version });
    }
    return yaml.toString();
  }
}
