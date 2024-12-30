import { utils } from 'fsh-sushi';
import { uniqWith } from 'lodash';
import { CodeSystemProcessor } from './CodeSystemProcessor';
import { CONFORMANCE_AND_TERMINOLOGY_RESOURCES } from './InstanceProcessor';
import { StructureDefinitionProcessor } from './StructureDefinitionProcessor';
import { ValueSetProcessor } from './ValueSetProcessor';
import { WildFHIR } from './WildFHIR';
import { FHIRDefinitions, logger, logMessage } from '../utils';
import { InMemoryVirtualPackage } from 'fhir-package-loader';

// Like FSHTank in SUSHI, but it doesn't contain FSH, it contains FHIR.  And who ever heard of a tank of FHIR?  But a lake of FHIR...
export class LakeOfFHIR implements utils.Fishable {
  readonly defs: FHIRDefinitions;

  constructor(public docs: WildFHIR[]) {
    this.defs = new FHIRDefinitions();
  }

  /**
   * Gets all non-instance structure definitions (profiles, extensions, logicals, and resources) in the lake
   * @returns {WildFHIR[]}
   */
  getAllStructureDefinitions(): WildFHIR[] {
    return this.docs
      .filter(d => d.content.resourceType === 'StructureDefinition')
      .filter(d => !this.isSDForInstance(d));
  }

  /**
   * Gets all value sets in the lake, optionally excluding value sets that can't be processed using FSH ValueSet syntax
   * @param includeUnsupported - indicates if value sets that can't be processed using FSH ValueSet syntax should be returned
   * @returns {WildFHIR[]}
   */
  getAllValueSets(includeUnsupported = true): WildFHIR[] {
    return this.docs.filter(
      d =>
        d.content.resourceType === 'ValueSet' &&
        (includeUnsupported || ValueSetProcessor.isProcessableValueSet(d.content))
    );
  }

  /**
   * Gets all code systems in the lake, optionally excluding code systems that can't be processed using FSH CodeSystem syntax
   * @param includeUnsupported - indicates if code systems that can't be processed using FSH CodeSystem syntax should be returned
   * @returns {WildFHIR[]}
   */
  getAllCodeSystems(includeUnsupported = true): WildFHIR[] {
    return this.docs.filter(
      d =>
        d.content.resourceType === 'CodeSystem' &&
        (includeUnsupported || CodeSystemProcessor.isProcessableCodeSystem(d.content))
    );
  }

  /**
   * Gets all implementation guides in the lake
   * @returns {WildFHIR[]}
   */
  getAllImplementationGuides(): WildFHIR[] {
    return this.docs.filter(d => d.content.resourceType === 'ImplementationGuide');
  }

  /**
   * Gets all instances in the lake, optionally including value sets / code systems that can't be processed using FSH VS/CS syntax
   * @param includeUnsupported - indicates if terminology resources that can't be processed using FSH VS/CS syntax should be returned
   * @returns {WildFHIR[]}
   */
  getAllInstances(includeUnsupportedTerminologyResources = false): WildFHIR[] {
    return this.docs.filter(d => {
      switch (d.content.resourceType) {
        case 'ImplementationGuide':
          return false;
        case 'StructureDefinition':
          return this.isSDForInstance(d);
        case 'CodeSystem':
          return (
            includeUnsupportedTerminologyResources &&
            !CodeSystemProcessor.isProcessableCodeSystem(d.content)
          );
        case 'ValueSet':
          return (
            includeUnsupportedTerminologyResources &&
            !ValueSetProcessor.isProcessableValueSet(d.content)
          );
        default:
          return true;
      }
    });
  }

  isSpecialization(d: WildFHIR): boolean {
    return (
      d.content.resourceType === 'StructureDefinition' && d.content.derivation === 'specialization'
    );
  }

  // A StructureDefinition can represent many different FSH types:
  // Profile, Extension, Logical, Resource, Instance
  // The first four are handled by the StructureDefinitionProcessor, but Instances are handled by InstanceProcessor.
  // Thus, splitting the categories based on that is useful.
  // The important fields here are kind and derivation.
  // A Profile has kind "resource", "complex-type", "logical", or "primitive-type" and derivation "constraint".
  // An Extension has kind "complex-type", derivation "constraint", and type "Extension". It's a special case of Profile.
  // A Logical has kind "logical" and derivation "specialization".
  // A Resource has kind "resource" and derivation "specialization".
  // Any other combination of values for kind and derivation represents an Instance.
  isSDForInstance(d: WildFHIR): boolean {
    if (d.content.resourceType === 'StructureDefinition') {
      if (d.content.derivation === 'specialization') {
        return ['primitive-type', 'complex-type'].includes(d.content.kind);
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  async prepareDefs() {
    this.assignMissingIds();
    this.removeDuplicateDefinitions();
    await this.defs.initialize();
    const lakeMap = new Map<string, any>();
    this.docs.forEach(wildFHIR => {
      lakeMap.set(wildFHIR.path, wildFHIR.content);
    });
    const lakePackage = new InMemoryVirtualPackage(
      { name: 'wild-fhir', version: '1.0.0' },
      lakeMap,
      {
        log: (level: string, message: string) => {
          logMessage(level, message);
        }
      }
    );
    return this.defs.loadVirtualPackage(lakePackage);
  }

  fishForFHIR(item: string, ...types: utils.Type[]) {
    return this.defs.fishForFHIR(item, ...types);
  }

  fishForMetadata(item: string, ...types: utils.Type[]): utils.Metadata {
    return this.defs.fishForMetadata(item, ...types);
  }

  /**
   * Removes any definitions from this.docs that have the same resourceType and id as
   * a previous definition, as long as there is a defined id.
   * Logs an error when it finds a duplicate
   */
  private removeDuplicateDefinitions() {
    const dupPaths: string[] = [];
    this.docs = uniqWith(this.docs, (a, b) => {
      const isDuplicate =
        a.content.id != null &&
        a.content.id === b.content.id &&
        a.content.resourceType === b.content.resourceType;
      if (isDuplicate) {
        dupPaths.push(`${a.path} (${a.content.resourceType}/${a.content.id}) matches ${b.path}`);
      }
      return isDuplicate;
    });

    if (dupPaths.length > 0) {
      logger.error(
        `Encountered ${dupPaths.length} definition(s) with the same resourceType and id as a previous definition. ` +
          'FHIR definitions should have unique resourceType and id. The following duplicate definitions will not be processed by GoFSH:' +
          `\n  - ${dupPaths.join('\n  - ')}`
      );
    }
  }

  /**
   * All definitions that will be Instances should have a resourceType and id.
   * If any Instance is missing an id, we add one.
   * If the instance is a conformance or terminology resource, we try to base the id off the name if it is available.
   * If there is no name or if it is any other type of resource, we add a clearly generated id with a counter.
   * Log a warning if it finds any definitions without an id
   */
  private assignMissingIds() {
    const createdIdPaths: string[] = [];
    let generatedId = 0;
    this.docs.forEach((d, index) => {
      const isSpecialFSHType =
        StructureDefinitionProcessor.isProcessableStructureDefinition(d.content) ||
        CodeSystemProcessor.isProcessableCodeSystem(d.content) ||
        ValueSetProcessor.isProcessableValueSet(d.content);
      if (d.content.id == null && !isSpecialFSHType) {
        if (CONFORMANCE_AND_TERMINOLOGY_RESOURCES.has(d.content.resourceType)) {
          // Try to be smart and set the id to the existing name
          d.content.id = d.content.name?.replace(/_/g, '-').slice(0, 64); // Turn a valid name into a valid id
        }

        if (d.content.id == null) {
          // If a Conformance/Terminology instance didn't have a name or if this any other resourceType, generate an id with a counter
          d.content.id = `GOFSH-GENERATED-ID-${generatedId++}`;
          // If another definition happen to have the same id as the one we just generated with a counter, increase the counter
          while (this.docs.some((a, i) => a.content.id === d.content.id && index !== i)) {
            d.content.id = `GOFSH-GENERATED-ID-${generatedId++}`;
          }
        }
        createdIdPaths.push(`${d.path} (${d.content.resourceType}/${d.content.id})`);
      }
    });

    if (createdIdPaths.length > 0) {
      logger.warn(
        `Encountered ${createdIdPaths.length} definition(s) that were missing an id. GoFSH created ids for the following:` +
          `\n  - ${createdIdPaths.join('\n  - ')}`
      );
    }
  }
}
