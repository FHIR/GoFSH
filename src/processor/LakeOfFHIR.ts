import { fhirdefs, utils } from 'fsh-sushi';
import { uniqWith } from 'lodash';
import { CodeSystemProcessor } from './CodeSystemProcessor';
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
   * Removes any definitions from this.docs that have the same resourceType and id as a previous definition.
   * Logs an error when it finds a duplicate
   */
  removeDuplicateDefinitions() {
    let dupNum = 0;
    const dupPaths: string[] = [];
    this.docs = uniqWith(this.docs, (a, b) => {
      const isDuplicate =
        a.content.id === b.content.id && a.content.resourceType === b.content.resourceType;
      if (isDuplicate) {
        dupNum++;
        dupPaths.push(`${a.path} (${a.content.resourceType}/${a.content.id}) matches ${b.path}`);
      }
      return isDuplicate;
    });

    if (dupNum > 0) {
      logger.error(
        `Encountered ${dupNum} definition(s) with the same resourceType and id as a previous definition. ` +
          'FHIR definitions should have unique resourceType and id. The following duplicate definitions will not be processed by GoFSH:' +
          `\n  - ${dupPaths.join('\n  - ')}`
      );
    }
  }
}
