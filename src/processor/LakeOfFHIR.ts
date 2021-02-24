import { fhirdefs, utils } from 'fsh-sushi';
import { uniqWith } from 'lodash';
import { CodeSystemProcessor } from './CodeSystemProcessor';
import { CONFORMANCE_AND_TERMINOLOGY_RESOURCES } from './InstanceProcessor';
import { StructureDefinitionProcessor } from './StructureDefinitionProcessor';
import { ValueSetProcessor } from './ValueSetProcessor';
import { WildFHIR } from './WildFHIR';
import { logger } from '../utils';

// Like FSHTank in SUSHI, but it doesn't contain FSH, it contains FHIR.  And who ever heard of a tank of FHIR?  But a lake of FHIR...
export class LakeOfFHIR implements utils.Fishable {
  constructor(public docs: WildFHIR[]) {}

  /**
   * Gets all structure definitions (profiles and extensions) in the lake
   * @returns {WildFHIR[]}
   */
  getAllStructureDefinitions(): WildFHIR[] {
    return this.docs.filter(d => d.content.resourceType === 'StructureDefinition');
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
        case 'StructureDefinition':
          return false;
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

  fishForFHIR(item: string, ...types: utils.Type[]) {
    // The simplest approach is just to re-use the FHIRDefinitions fisher.  But since this.docs can be modified by anyone at any time
    // the only safe way to do this is by rebuilding a FHIRDefinitions object each time we need it.  If this becomes a performance
    // concern, we can optimize it later -- but performance isn't a huge concern in GoFSH. Note also that this approach may need to be
    // updated if we ever need to support fishing for Instances.
    const defs = new fhirdefs.FHIRDefinitions();
    this.docs.forEach(d => defs.add(d.content));
    return defs.fishForFHIR(item, ...types);
  }

  fishForMetadata(item: string, ...types: utils.Type[]): utils.Metadata {
    // The simplest approach is just to re-use the FHIRDefinitions fisher.  But since this.docs can be modified by anyone at any time
    // the only safe way to do this is by rebuilding a FHIRDefinitions object each time we need it.  If this becomes a performance
    // concern, we can optimize it later -- but performance isn't a huge concern in GoFSH. Note also that this approach may need to be
    // updated if we ever need to support fishing for Instances.
    const defs = new fhirdefs.FHIRDefinitions();
    this.docs.forEach(d => defs.add(d.content));
    return defs.fishForMetadata(item, ...types);
  }

  /**
   * Removes any definitions from this.docs that have the same resourceType and id as
   * a previous definition, as long as there is a defined id.
   * Logs an error when it finds a duplicate
   */
  removeDuplicateDefinitions() {
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
  assignMissingIds() {
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
