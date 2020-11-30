import { fhirdefs, utils } from 'fsh-sushi';
import { ValueSetProcessor } from './ValueSetProcessor';
import { WildFHIR } from './WildFHIR';

// Like FSHTank in SUSHI, but it doesn't contain FSH, it contains FHIR.  And who ever heard of a tank of FHIR?  But a lake of FHIR...
export class LakeOfFHIR implements utils.Fishable {
  constructor(public readonly docs: WildFHIR[]) {}

  /**
   * Gets all structure definitions (profiles and extensions) in the lake
   * @returns {WildFHIR[]}
   */
  getAllStructureDefinitions(): WildFHIR[] {
    return this.docs.filter(d => d.content.resourceType === 'StructureDefinition');
  }

  /**
   * Gets all value sets in the lake
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
   * Gets all code systems in the lake
   * @returns {WildFHIR[]}
   */
  getAllCodeSystems(): WildFHIR[] {
    return this.docs.filter(d => d.content.resourceType === 'CodeSystem');
  }

  /**
   * Gets all implementation guides in the lake
   * @returns {WildFHIR[]}
   */
  getAllImplementationGuides(): WildFHIR[] {
    return this.docs.filter(d => d.content.resourceType === 'ImplementationGuide');
  }

  /**
   * Gets all instances in the lake
   * @returns {WildFHIR[]}
   */
  getAllInstances(includeUnsupportedValueSets = false): WildFHIR[] {
    return this.docs.filter(d => {
      switch (d.content.resourceType) {
        case 'ImplementationGuide':
        case 'StructureDefinition':
        case 'CodeSystem':
          return false;
        case 'ValueSet':
          return includeUnsupportedValueSets && !ValueSetProcessor.isProcessableValueSet(d.content);
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
}
