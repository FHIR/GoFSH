import { isWebUri } from 'valid-url';
import { utils } from 'fsh-sushi';
import { ExportableAlias } from '../exportable';

export function optimizeURL(
  url: string,
  aliases: ExportableAlias[],
  types: utils.Type[],
  fisher: utils.Fishable
): string {
  return resolveURL(url, types, fisher) ?? resolveAliasFromURL(url, aliases) ?? url;
}

/**
 * Resolves a URL to a name, if possible; otherwise returns the URL. If the URL resolves to a name,
 * but the name does not resolve back to the same URL, then return the URL since the name clashes with
 * a more preferred name. This can happen if a project defines something with the same name as a FHIR
 * definition.
 * @param url - the url to resolve
 * @param types - the allowed types to resolve against
 * @param fisher - a fisher for finding definitions to use during resolution
 * @returns {string} the name representing the URL or undefined if it cannot be resolved to a name
 */
export function resolveURL(
  url: string,
  types: utils.Type[],
  fisher: utils.Fishable
): string | undefined {
  if (url == null) {
    return;
  }

  const def = fisher.fishForMetadata(url, ...types);
  // NOTE: Testing against a regex from FHIR because some FHIR core definitions have names that are
  // invalid against the spec!  Good heavens!
  if (
    def?.name.match(/^[A-Z]([A-Za-z0-9_]){0,254}$/) &&
    fisher.fishForMetadata(def.name, ...types).url === url
  ) {
    return def.name;
  }
}

/**
 * Gets an alias for a url. If an alias exists, it is used. If no alias exists, an alias is generated
 * from the url
 * @param aliases - a map of existing aliases
 * @param url - the url to get
 * @param fisher - a fisher for finding definitions to use during resolution
 * @returns {string | undefined} the name representing the URL or the undefined if no alias exists or can be created
 */
export function resolveAliasFromURL(url: string, aliases: ExportableAlias[]): string | undefined {
  const existingAlias = aliases.find(a => a.url === url);
  if (existingAlias) {
    return existingAlias.alias;
  } else {
    if (!isWebUri(url)) {
      return;
    }
    // Try to construct a human readable alias from the url
    const parsedURL = new URL(url);
    const rawAlias =
      parsedURL.pathname && parsedURL.pathname !== '/'
        ? parsedURL.pathname?.split('/').slice(-1)[0]
        : parsedURL.hostname?.replace('www.', '').split('.')[0];

    if (rawAlias == null) {
      return;
    }
    // Ensure the generated alias is unique
    const aliasPart = `$${rawAlias}`;
    let counterPart = 0;
    let alias = aliasPart;
    const existingAliases = aliases.map(a => a.alias);
    while (existingAliases.includes(alias)) {
      counterPart += 1;
      alias = `${aliasPart}_${counterPart}`;
    }

    aliases.push(new ExportableAlias(alias, url));
    return alias;
  }
}
