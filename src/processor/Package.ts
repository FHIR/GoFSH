import {
  ExportableExtension,
  ExportableProfile,
  ExportableInstance,
  ExportableValueSet,
  ExportableCodeSystem,
  ExportableInvariant,
  ExportableConfiguration,
  ExportableMapping,
  ExportableAlias,
  NamedExportable
} from '../exportable';
import { logger } from '../utils';

export class Package {
  public readonly profiles: ExportableProfile[] = [];
  public readonly extensions: ExportableExtension[] = [];
  public readonly instances: ExportableInstance[] = [];
  public readonly valueSets: ExportableValueSet[] = [];
  public readonly codeSystems: ExportableCodeSystem[] = [];
  public readonly invariants: ExportableInvariant[] = [];
  public readonly mappings: ExportableMapping[] = [];
  public readonly aliases: ExportableAlias[] = [];
  public configuration: ExportableConfiguration;

  constructor() {}

  add(
    resource:
      | ExportableProfile
      | ExportableExtension
      | ExportableInstance
      | ExportableValueSet
      | ExportableCodeSystem
      | ExportableInvariant
      | ExportableConfiguration
      | ExportableMapping
  ) {
    if (resource instanceof ExportableProfile) {
      if (!isDuplicateDefinition(this.profiles, resource, 'profile')) {
        this.profiles.push(resource);
      }
    } else if (resource instanceof ExportableExtension) {
      if (!isDuplicateDefinition(this.extensions, resource, 'extension')) {
        this.extensions.push(resource);
      }
    } else if (resource instanceof ExportableInstance) {
      if (!isDuplicateDefinition(this.instances, resource, 'instance')) {
        this.instances.push(resource);
      }
    } else if (resource instanceof ExportableValueSet) {
      if (!isDuplicateDefinition(this.valueSets, resource, 'value set')) {
        this.valueSets.push(resource);
      }
    } else if (resource instanceof ExportableCodeSystem) {
      if (!isDuplicateDefinition(this.codeSystems, resource, 'code system')) {
        this.codeSystems.push(resource);
      }
    } else if (resource instanceof ExportableInvariant) {
      if (!isDuplicateDefinition(this.invariants, resource, 'invariant')) {
        this.invariants.push(resource);
      }
    } else if (resource instanceof ExportableMapping) {
      if (!isDuplicateDefinition(this.mappings, resource, 'mapping')) {
        this.mappings.push(resource);
      }
    } else if (resource instanceof ExportableConfiguration) {
      if (this.configuration) {
        logger.warn(
          `Multiple implementation guide resources found in input folder. Skipping implementation guide with canonical ${resource.config.canonical}`
        );
      } else {
        this.configuration = resource;
      }
    }
  }
}

function isDuplicateDefinition(
  array: NamedExportable[],
  resource: NamedExportable,
  type: string
): boolean {
  if (array.find(e => e.name === resource.name)) {
    logger.error(
      `Encountered ${type} with a duplicate name, ${resource.name}, which GoFSH cannot make unique. Fix the source file to resolve this error. The definition will still be written to a .fsh file.`
    );
    return true;
  }
  return false;
}
