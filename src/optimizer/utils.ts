import { utils } from 'fsh-sushi';
import { MasterFisher } from '../utils';
import { CodeSystemProcessor, ValueSetProcessor } from '../processor';

/**
 * Resolves a URL to a name, if possible; otherwise returns the URL. If the URL resolves to a name,
 * but the name does not resolve back to the same URL, then return the URL since the name clashes with
 * a more preferred name. This can happen if a project defines something with the same name as a FHIR
 * definition.
 * @param url - the url to resolve
 * @param types - the allowed types to resolve against
 * @param fisher - a fisher for finding definitions to use during resolution
 * @returns {string} the name representing the URL or the URL itself if it cannot be resolved to a name
 */
export function resolveURL(url: string, types: utils.Type[], fisher: MasterFisher): string {
  if (url == null) {
    return url;
  }

  const def = fisher.fishForFHIR(url, ...types);

  // SUSHI currently does not properly fish for CodeSystems or ValueSets represented as FSH Instances,
  // so if the URL resolves to an unsupported CodeSystem or ValueSet from the LakeOfFHIR, don't optimize it!
  // TODO: Revisit this once SUSHI correctly fishes for unsupported CodeSystems and ValueSets.
  if (
    ((def?.resourceType === 'CodeSystem' && !CodeSystemProcessor.isProcessableCodeSystem(def)) ||
      (def?.resourceType === 'ValueSet' && !ValueSetProcessor.isProcessableValueSet(def))) &&
    fisher.lakeOfFHIR.fishForFHIR(url, ...types) != null
  ) {
    return url;
  }

  // NOTE: Testing against a regex from FHIR because some FHIR core definitions have names that are
  // invalid against the spec!  Good heavens!
  if (
    def?.name.match(/^[A-Z]([A-Za-z0-9_]){0,254}$/) &&
    fisher.fishForMetadata(def.name, ...types).url === url
  ) {
    return def.name;
  }
  return url;
}
