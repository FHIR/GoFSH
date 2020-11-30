import { flatten } from 'flat';
import { pickBy, mapKeys } from 'lodash';
import { fhirtypes, fshtypes, utils } from 'fsh-sushi';
import { fshifyString, removeUnderscoreForPrimitiveChildPath } from '../exportable/common';
import { ProcessableStructureDefinition } from '../processor';
import { StructureDefinition, ElementDefinition } from 'fsh-sushi/dist/fhirtypes';

// This function depends on the id of an element to construct the path.
// Per the specification https://www.hl7.org/fhir/elementdefinition.html#id, we should
// be able to assume that id will exist and each token will have the form pathpart:slicename/reslicename
export function getPath(element: fhirtypes.ElementDefinition): string {
  const FHIRtokens = element.id.split('.').slice(1);
  // If the id is for the root element (ex "Observation"), we specify that path in FSH as "."
  if (!FHIRtokens.length) {
    return '.';
  }
  const FSHtokens: string[] = [];
  FHIRtokens.forEach(FHIRtoken => {
    const [pathPart, slicePart] = FHIRtoken.split(':', 2);
    const sliceTokens = slicePart?.split('/');
    // If this is a sliced choice element, we use the sliceName for the path
    // value[x]:valueString -> valueString
    if (pathPart.endsWith('[x]') && sliceTokens?.length) {
      FSHtokens.push(sliceTokens[0]);
      return;
    }
    // Construct the FSHToken to be equivalent to the FHIR token but with [] for slicing and reslicing
    let FSHToken = pathPart;
    sliceTokens?.forEach(sliceToken => (FSHToken += `[${sliceToken}]`));
    FSHtokens.push(FSHToken);
  });
  return FSHtokens.join('.');
}

export type FlatObject = { [key: string]: number | string | boolean };

export function getPathValuePairs(object: object): FlatObject {
  const flatObject: FlatObject = flatten(object);
  const flatFSHObject: FlatObject = {};
  Object.keys(flatObject)
    .filter(key => flatObject[key] != null)
    .forEach(key => {
      // TODO: This assumes that the values can be taken as-is, not the case for something like "code" data types
      // since they must be converted from a "foo" to "#foo"
      flatFSHObject[key.replace(/\.(\d+)([\.]|$)/g, (match, p1, p2) => `[${p1}]${p2}`)] =
        flatObject[key];
    });
  return flatFSHObject;
}

export function getFSHValue(
  key: string,
  flatObject: FlatObject,
  resourceType: string,
  fisher: utils.Fishable
): number | boolean | string | fshtypes.FshCode {
  const value = flatObject[key];
  const definition = StructureDefinition.fromJSON(
    fisher.fishForFHIR(resourceType, utils.Type.Resource, utils.Type.Type)
  );
  // Finding element by path works without array information and _ from children of primitives
  const pathWithoutIndex = removeUnderscoreForPrimitiveChildPath(key).replace(/\[\d+\]/g, '');
  const element = definition.findElementByPath(pathWithoutIndex, fisher);
  // If the path is one on an entry/contained resource, find the element on the ResourceType of the entry/contained resource
  if (
    element == null &&
    (pathWithoutIndex.startsWith('entry.resource.') || pathWithoutIndex.startsWith('contained.'))
  ) {
    let basePath: string;
    if (element == null && pathWithoutIndex.startsWith('entry.resource.')) {
      basePath = key.split('.').slice(0, 2).join('.') + '.';
    } else if (element == null && pathWithoutIndex.startsWith('contained.')) {
      basePath = key.split('.').slice(0, 1).join('.') + '.';
    }
    // Only need to worry about fixed values of entry/contained resource
    let filteredFlatObject = pickBy(flatObject, (value, key) => key.startsWith(basePath));
    // Modify the object to make paths relative to the entry/contained resource
    filteredFlatObject = mapKeys(filteredFlatObject, (value, key) =>
      key.substring(basePath.length)
    );
    const containedResourceType = filteredFlatObject['resourceType'] as string;

    // Get the FSH value based on the contained resource type. Use paths relative to the contained resource.
    return getFSHValue(
      key.replace(basePath, ''),
      filteredFlatObject,
      containedResourceType,
      fisher
    );
  }
  if (element?.type?.[0]?.code === 'code') {
    return new fshtypes.FshCode(value.toString());
  }
  return typeof value === 'string' ? fshifyString(value) : value;
}

export function getAncestorElement(
  id: string,
  structDef: ProcessableStructureDefinition,
  fisher: utils.Fishable
): any {
  let element: any;
  let currentStructDef = fisher.fishForFHIR(structDef.baseDefinition);
  while (currentStructDef && !element) {
    element =
      currentStructDef.snapshot?.element.find((el: any) => el.id === id) ??
      currentStructDef.differential?.element.find((el: any) => el.id === id);
    currentStructDef = fisher.fishForFHIR(currentStructDef.baseDefinition);
  }
  return element ?? null;
}

export function getCardinality(
  id: string,
  structDef: ProcessableStructureDefinition,
  fisher: utils.Fishable
): { min: number; max: string } {
  let min: number;
  let max: string;
  let currentStructDef = structDef;
  while (currentStructDef && (min == null || max == null)) {
    const element =
      currentStructDef.snapshot?.element.find((el: any) => el.id === id) ??
      currentStructDef.differential?.element.find((el: any) => el.id === id);
    min = min ?? element?.min;
    max = max ?? element?.max;
    currentStructDef = fisher.fishForFHIR(currentStructDef.baseDefinition);
  }
  return min != null && max != null ? { min, max } : null;
}
