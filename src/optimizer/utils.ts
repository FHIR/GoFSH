import { fhirtypes, utils } from 'fsh-sushi';
import { MasterFisher } from '../utils';
import { CodeSystemProcessor, ValueSetProcessor } from '../processor';
import {
  ExportableCodeSystem,
  ExportableExtension,
  ExportableInstance,
  ExportableProfile,
  ExportableValueSet
} from '../exportable';

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

/**
 * Gets the element types for a given path in respect to an instance of a FHIR resource.
 * Returns undefined if it was not able to determine the types (due to missing definitions, etc.).
 * @param instance - the instance the path relates to
 * @param path - the path to the element of interest
 * @param fisher - a fisher to lookup the instance definition
 * @returns an array of types or undefined if it could not determine the types
 */
export function getTypesForInstancePath(
  instance: ExportableInstance,
  path: string,
  fisher: MasterFisher
): fhirtypes.ElementDefinitionType[] | undefined {
  return getTypesForPath(instance.instanceOf, path, fisher);
}

/**
 * Gets the element types for a given caret path in respect to a definition and rule path.
 * Returns undefined if it was not able to determine the types (due to missing definitions, etc.).
 * @param definition - the profile, extension, valueset, or codesystem the path relates to
 * @param rulePath - the path to the element of interest to which the caret relates
 * @param caretPath - the path to the element of interest within the definitional object
 * @param fisher - a fisher to lookup the necessary definitions
 * @returns an array of types or undefined if it could not determine the types
 */
export function getTypesForCaretPath(
  definition: ExportableProfile | ExportableExtension | ExportableValueSet | ExportableCodeSystem,
  rulePath: string,
  caretPath: string,
  fisher: MasterFisher
) {
  let instanceOf;
  if (definition instanceof ExportableProfile || definition instanceof ExportableExtension) {
    // We're not concerned w/ what specific element it is, just that it is an element (if there is a rulePath)
    instanceOf = rulePath?.length ? 'ElementDefinition' : 'StructureDefinition';
  } else if (definition instanceof ExportableValueSet) {
    instanceOf = 'ValueSet';
  } else if (definition instanceof ExportableCodeSystem) {
    instanceOf = 'CodeSystem';
  }
  return getTypesForPath(instanceOf, caretPath, fisher);
}

function getTypesForPath(
  instanceOf: string,
  path: string,
  fisher: MasterFisher
): fhirtypes.ElementDefinitionType[] | undefined {
  const instanceOfDef = fisher.fishForFHIR(instanceOf);
  if (instanceOfDef?.resourceType === 'StructureDefinition') {
    const instanceOfSD = fhirtypes.StructureDefinition.fromJSON(instanceOfDef);
    // NOTE: Normalize the path to remove indexes and/or slice references
    const element = instanceOfSD.findElementByPath(path.replace(/\[[^\]]+\]/g, ''), fisher);
    return element?.type;
  }
}
