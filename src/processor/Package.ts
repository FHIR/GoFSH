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
  NamedExportable,
  ExportableResource,
  ExportableLogical
} from '../exportable';
import { logger } from '../utils';

export class Package {
  public readonly profiles: ExportableProfile[] = [];
  public readonly extensions: ExportableExtension[] = [];
  public readonly resources: ExportableResource[] = [];
  public readonly logicals: ExportableLogical[] = [];
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
      | ExportableResource
      | ExportableLogical
      | ExportableInstance
      | ExportableValueSet
      | ExportableCodeSystem
      | ExportableInvariant
      | ExportableConfiguration
      | ExportableMapping
      | ExportableAlias
  ) {
    if (resource instanceof ExportableProfile) {
      checkDuplicateDefinition(this.profiles, resource, 'profile');
      this.profiles.push(resource);
    } else if (resource instanceof ExportableExtension) {
      checkDuplicateDefinition(this.extensions, resource, 'extension');
      this.extensions.push(resource);
    } else if (resource instanceof ExportableResource) {
      checkDuplicateDefinition(this.resources, resource, 'resource');
      this.resources.push(resource);
    } else if (resource instanceof ExportableLogical) {
      checkDuplicateDefinition(this.logicals, resource, 'logical');
      this.logicals.push(resource);
    } else if (resource instanceof ExportableInstance) {
      checkDuplicateDefinition(this.instances, resource, 'instance');
      this.instances.push(resource);
    } else if (resource instanceof ExportableValueSet) {
      checkDuplicateDefinition(this.valueSets, resource, 'value set');
      this.valueSets.push(resource);
    } else if (resource instanceof ExportableCodeSystem) {
      checkDuplicateDefinition(this.codeSystems, resource, 'code system');
      this.codeSystems.push(resource);
    } else if (resource instanceof ExportableInvariant) {
      checkDuplicateDefinition(this.invariants, resource, 'invariant');
      this.invariants.push(resource);
    } else if (resource instanceof ExportableMapping) {
      checkDuplicateDefinition(this.mappings, resource, 'mapping');
      this.mappings.push(resource);
    } else if (resource instanceof ExportableAlias) {
      if (this.aliases.find(e => e.alias === resource.alias)) {
        logger.error(
          `Encountered alias with a duplicate name, ${resource.alias}, which GoFSH cannot make unique. Fix the source file to resolve this error or update the resulting FSH definition.`
        );
      }
      this.aliases.push(resource);
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

// When we call this function, we have already removed definitions that had the same resourceType and id
// We have also already tried to de-deduplicate the name if we can (for example, Instances add the InstanceOf information to their name)
// At this point, if a definition has the same name as another, the definition or the resulting FSH will need to be
// changed by hand in order for SUSHI to process it without errors.
// Log an error that there will be a definition with the same name written to FSH files.
function checkDuplicateDefinition(
  array: NamedExportable[],
  resource: NamedExportable,
  type: string
): boolean {
  if (array.find(e => e.name === resource.name)) {
    logger.error(
      `Encountered ${type} with a duplicate name, ${resource.name}, which GoFSH cannot make unique. Fix the source file to resolve this error or update the resulting FSH definition.`
    );
    return true;
  }
  return false;
}
