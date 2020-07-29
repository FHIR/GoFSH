import { Profile, Extension, Instance, FshValueSet, FshCodeSystem } from 'fsh-sushi/dist/fshtypes';

export class Package {
  public readonly profiles: Profile[] = [];
  public readonly extensions: Extension[] = [];
  public readonly instances: Instance[] = [];
  public readonly valueSets: FshValueSet[] = [];
  public readonly codeSystems: FshCodeSystem[] = [];

  constructor() {}

  add(resource: Profile | Extension | Instance | FshValueSet | FshCodeSystem) {
    if (resource instanceof Profile) {
      this.profiles.push(resource);
    } else if (resource instanceof Extension) {
      this.extensions.push(resource);
    } else if (resource instanceof Instance) {
      this.instances.push(resource);
    } else if (resource instanceof FshValueSet) {
      this.valueSets.push(resource);
    } else if (resource instanceof FshCodeSystem) {
      this.codeSystems.push(resource);
    }
  }
}
