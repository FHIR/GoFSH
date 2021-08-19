import { flatten } from 'flat';
import { flatMap, flatten as flat, isObject, isEmpty, isNil } from 'lodash';
import { fhirtypes, fshtypes, utils } from 'fsh-sushi';
import { removeUnderscoreForPrimitiveChildPath } from '../exportable/common';
import { ProcessableStructureDefinition, ProcessableElementDefinition } from '../processor';

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

const typeCache: Map<string, Map<string, string>> = new Map();

export function getFSHValue(
  index: number,
  flatArray: [string, string | number | boolean][],
  resourceType: string,
  fisher: utils.Fishable
): number | boolean | string | fshtypes.FshCode | bigint {
  const [key, value] = flatArray[index];
  const fishingType = resourceType === 'Concept' ? 'CodeSystem' : resourceType;
  // Finding element by path works without array information and _ from children of primitives
  let pathWithoutIndex = removeUnderscoreForPrimitiveChildPath(key).replace(/\[\d+\]/g, '');
  if (resourceType === 'Concept') {
    pathWithoutIndex = `concept.${pathWithoutIndex}`;
  }
  // If we have already looked up this path for this resource, get it from cache
  const type = typeCache.get(resourceType)?.get(pathWithoutIndex);
  if (type === 'code') {
    return new fshtypes.FshCode(value.toString());
  } else if (type === 'integer64') {
    return BigInt(value);
  } else if (type) {
    return value;
  }

  // If the path is one on an entry/contained resource, find the element on the ResourceType of the entry/contained resource
  if (pathWithoutIndex.startsWith('entry.resource.') || pathWithoutIndex.startsWith('contained.')) {
    const [, baseKey, newKey] = key.match(/^(entry\[\d+\].resource|contained\[\d+\])\.(.+)/);
    // We can safely assume that all of the paths for a given contained resource are
    // sequential in the flatArray, so find the start and end of that sequence and slice it out
    const nestedResourceStartIndex = flatArray.findIndex(([key]) => key.startsWith(baseKey));
    let nestedResourceEndIndex = nestedResourceStartIndex + 1;
    while (flatArray[nestedResourceEndIndex]?.[0].startsWith(baseKey)) {
      nestedResourceEndIndex++;
    }
    const subArray = flatArray
      .slice(nestedResourceStartIndex, nestedResourceEndIndex)
      .map(([key, value]) => [
        key.replace(/^(entry\[\d+\].resource|contained\[\d+\])\./, ''),
        value
      ]) as [string, string | number | boolean][];
    const containedResourceType = subArray.find(([key]) => key === 'resourceType')?.[1] as string;
    const newIndex = subArray.findIndex(([key]) => key === newKey);

    // Get the FSH value based on the contained resource type. Use paths relative to the contained resource.
    return getFSHValue(newIndex, subArray, containedResourceType, fisher);
  }
  if (!typeCache.has(resourceType)) {
    typeCache.set(resourceType, new Map());
  }
  const definition = fhirtypes.StructureDefinition.fromJSON(
    fisher.fishForFHIR(fishingType, utils.Type.Resource, utils.Type.Type)
  );
  const element = definition.findElementByPath(pathWithoutIndex, fisher);
  if (element?.type?.[0]?.code === 'code') {
    typeCache.get(resourceType).set(pathWithoutIndex, 'code');
    return new fshtypes.FshCode(value.toString());
  } else if (element?.type?.[0]?.code === 'integer64') {
    typeCache.get(resourceType).set(pathWithoutIndex, 'integer64');
    return BigInt(value);
  }
  typeCache.get(resourceType).set(pathWithoutIndex, typeof value);
  return value;
}

// Typical empty FSH values are: [], {}, null, undefined
export function isFSHValueEmpty(fshValue: any): boolean {
  return (isObject(fshValue) && isEmpty(fshValue)) || isNil(fshValue);
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

export function getAncestorSliceDefinition(
  element: ProcessableElementDefinition,
  sd: ProcessableStructureDefinition,
  fisher: utils.Fishable
) {
  // slices may be defined in various ways.
  // for example, the slice Z at path:
  // alpha[X].beta[Y].gamma[Z]
  // may be defined in any of the following ways:
  // alpha.beta.gamma[Z]
  // alpha[X].beta.gamma[Z]
  // alpha.beta[Y].gamma[Z]
  // alpha[X].beta[Y].gamma[Z]
  // we can use getAncestorElement to help us out here.
  if (element.sliceName) {
    const idParts = element.id.split('.');
    // if there are slices earlier in the id,
    // check both the slice and list element.
    const idPartVariations = [
      ...idParts.slice(0, -1).map(part => {
        if (part.indexOf(':') > -1) {
          return [part, part.split(':')[0]];
        } else {
          return [part];
        }
      }),
      idParts.slice(-1)
    ];
    // the set of ids to check is the cartesian product of all the id variations
    const idsToCheck = cartesian(...idPartVariations);
    for (const id of idsToCheck) {
      const ancestorElement = getAncestorElement(id.join('.'), sd, fisher);
      if (ancestorElement) {
        return ancestorElement;
      }
    }
  }
}

// adapted from https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript#43053803
function cartesian(...sublists: any[][]) {
  return sublists.reduce((prevList, curList) => {
    return flatMap(prevList, prevElement => {
      return curList.map(curElement => {
        return flat([prevElement, curElement]);
      });
    });
  });
}
