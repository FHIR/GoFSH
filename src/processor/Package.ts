import {
  ExportableExtension,
  ExportableProfile,
  ExportableInstance,
  ExportableValueSet,
  ExportableCodeSystem
} from '../exportable';
import { FHIRProcessor } from './FHIRProcessor';

export class Package {
  public readonly profiles: ExportableProfile[] = [];
  public readonly extensions: ExportableExtension[] = [];
  public readonly instances: ExportableInstance[] = [];
  public readonly valueSets: ExportableValueSet[] = [];
  public readonly codeSystems: ExportableCodeSystem[] = [];

  constructor() {}

  add(
    resource:
      | ExportableProfile
      | ExportableExtension
      | ExportableInstance
      | ExportableValueSet
      | ExportableCodeSystem
  ) {
    if (resource instanceof ExportableProfile) {
      this.profiles.push(resource);
    } else if (resource instanceof ExportableExtension) {
      this.extensions.push(resource);
    } else if (resource instanceof ExportableInstance) {
      this.instances.push(resource);
    } else if (resource instanceof ExportableValueSet) {
      this.valueSets.push(resource);
    } else if (resource instanceof ExportableCodeSystem) {
      this.codeSystems.push(resource);
    }
  }

  // TODO: if more optimization steps are added, break them into separate functions.
  optimize(processor: FHIRProcessor) {
    // optimization step: resolving parents on Profiles
    for (const profile of this.profiles) {
      if (profile.parent) {
        const parentSd = processor.structureDefinitions.find(sd => sd.url === profile.parent);
        if (parentSd?.name) {
          profile.parent = parentSd.name;
        }
      }
    }
  }
}
