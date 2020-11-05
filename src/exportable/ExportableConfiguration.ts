import YAML from 'yaml';
import { fshtypes } from 'fsh-sushi';
import { Exportable } from '.';
import { ImplementationGuideDependsOn } from 'fsh-sushi/dist/fhirtypes';

export class ExportableConfiguration implements Exportable {
  constructor(public config: fshtypes.Configuration) {}

  toFSH(): string {
    // canonical, fhirVersion, and FSHOnly are always present
    const yaml = new YAML.Document();
    yaml.contents = YAML.createNode({
      canonical: this.config.canonical,
      fhirVersion: this.config.fhirVersion[0],
      FSHOnly: this.config.FSHOnly
    });
    // id, name, status, version, and dependencies are the optional configuration properties.
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
    if (this.config.dependencies) {
      const fshDependencies: any[] = [];
      this.config.dependencies.forEach((dependency: ImplementationGuideDependsOn) => {
        fshDependencies.push({
          [dependency.packageId]: dependency.version
        });
      });

      yaml.contents.add({ key: 'dependencies', value: fshDependencies });
    }
    return yaml.toString();
  }
}
