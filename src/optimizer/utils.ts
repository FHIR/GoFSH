import { utils } from 'fsh-sushi';

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
export function resolveURL(url: string, types: utils.Type[], fisher: utils.Fishable): string {
  if (url == null) {
    return url;
  }

  const def = fisher.fishForMetadata(url, ...types);
  if (def?.name && fisher.fishForMetadata(def.name, ...types).url === url) {
    return def.name;
  }
  return url;
}
