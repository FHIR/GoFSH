import { flatten } from 'flat';
import { flatMap, flatten as flat, isObject, isEmpty, isNil } from 'lodash';
import { fhirtypes, fshtypes, utils } from 'fsh-sushi';
import { ProcessableStructureDefinition, ProcessableElementDefinition } from '../processor';
import { logger } from './GoFSHLogger';

// See https://hl7.org/fhir/R5/datatypes.html#dateTime
export const dateTimeRegex = /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1])(T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]+)?(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00)))?)?)?$/;
// See https://hl7.org/fhir/R5/datatypes.html#date
export const dateRegex = /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1]))?)?$/;
// See https://hl7.org/fhir/R5/datatypes.html#time
export const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]{1,9})?$/;
// See https://hl7.org/fhir/R5/datatypes.html#instant
export const instantRegex = /^([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]{1,9})?(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00))$/;

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
    // Construct the FSHToken to be equivalent to the FHIR token except:
    // - Use [] for slicing and reslicing (instead of ':' and '/')
    // - Remove leading '_' since FSH does not require them in its paths
    let FSHToken = pathPart.replace(/^_/, '');
    sliceTokens?.forEach(sliceToken => (FSHToken += `[${sliceToken}]`));
    FSHtokens.push(FSHToken);
  });
  return FSHtokens.join('.');
}

export type FlatObject = { [key: string]: number | string | boolean };

export function getPathValuePairs(
  originalObject: object,
  keyConverter: (x: string) => string = identityKey
): FlatObject {
  const flatObject: any = flatten(originalObject, { safe: true });
  const flatFSHObject: FlatObject = {};
  Object.keys(flatObject)
    .filter(key => flatObject[key] != null)
    .forEach(key => {
      const newKey = keyConverter(key).replace(/(^|\.)_/g, (_, sep) => `${sep}`);
      if (Array.isArray(flatObject[key])) {
        const subFlat = getPathValuePairs(flatObject[key], arrayIndexKey);
        Object.keys(subFlat).forEach(subKey => {
          if (subFlat[subKey] != null) {
            const combinedKey = newKey + subKey;
            flatFSHObject[combinedKey] = subFlat[subKey];
          }
        });
      } else {
        flatFSHObject[newKey] = flatObject[key];
      }
    });

  return flatFSHObject;
}

function identityKey(key: string): string {
  return key;
}

function arrayIndexKey(key: string): string {
  const splitKey = key.split('.');
  splitKey[0] = `[${splitKey[0]}]`;
  return splitKey.join('.');
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
  // Finding element by path works without array information (note: leading _ has been removed by this point)
  let pathWithoutIndex = key.replace(/\[\d+\]/g, '');
  if (resourceType === 'Concept') {
    pathWithoutIndex = `concept.${pathWithoutIndex}`;
  }
  // If we have already looked up this path for this resource, get it from cache
  const type = typeCache.get(resourceType)?.get(pathWithoutIndex);
  if (type === 'code') {
    return new fshtypes.FshCode(value.toString());
  } else if (type === 'integer64') {
    return BigInt(value);
  } else if (type === 'dateTime') {
    if (!dateTimeRegex.test(value.toString())) {
      logger.warn(`Value ${value.toString()} on element ${key} is not a valid FHIR dateTime`);
    }
    return value;
  } else if (type === 'date') {
    if (!dateRegex.test(value.toString())) {
      logger.warn(`Value ${value.toString()} on element ${key} is not a valid FHIR date`);
    }
    return value;
  } else if (type === 'time') {
    if (!timeRegex.test(value.toString())) {
      logger.warn(`Value ${value.toString()} on element ${key} is not a valid FHIR time`);
    }
    return value;
  } else if (type === 'instant') {
    typeCache.get(resourceType).set(pathWithoutIndex, 'instant');
    if (!instantRegex.test(value.toString())) {
      logger.warn(`Value ${value.toString()} on element ${key} is not a valid FHIR instant`);
    }
    return value;
  } else if (type) {
    return value;
  }

  // If the path is one on an entry/contained resource, find the element on the ResourceType of the entry/contained resource
  if (
    pathWithoutIndex.startsWith('entry.resource.') ||
    pathWithoutIndex.startsWith('parameter.resource.') ||
    pathWithoutIndex.startsWith('contained.')
  ) {
    const [, baseKey, newKey] = key.match(
      /^((?:entry|parameter)\[\d+\].resource|contained\[\d+\])\.(.+)/
    );
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
        key.replace(/^((entry|parameter)\[\d+\].resource|contained\[\d+\])\./, ''),
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
  } else if (element?.type?.[0]?.code === 'dateTime') {
    typeCache.get(resourceType).set(pathWithoutIndex, 'dateTime');
    if (!dateTimeRegex.test(value.toString())) {
      logger.warn(`Value ${value.toString()} on element ${key} is not a valid FHIR dateTime`);
    }
    return value;
  } else if (element?.type?.[0]?.code === 'date') {
    typeCache.get(resourceType).set(pathWithoutIndex, 'date');
    if (!dateRegex.test(value.toString())) {
      logger.warn(`Value ${value.toString()} on element ${key} is not a valid FHIR date`);
    }
    return value;
  } else if (element?.type?.[0]?.code === 'time') {
    typeCache.get(resourceType).set(pathWithoutIndex, 'time');
    if (!timeRegex.test(value.toString())) {
      logger.warn(`Value ${value.toString()} on element ${key} is not a valid FHIR time`);
    }
    return value;
  } else if (element?.type?.[0]?.code === 'instant') {
    typeCache.get(resourceType).set(pathWithoutIndex, 'instant');
    if (!instantRegex.test(value.toString())) {
      logger.warn(`Value ${value.toString()} on element ${key} is not a valid FHIR instant`);
    }
    return value;
  } else {
    typeCache.get(resourceType).set(pathWithoutIndex, typeof value);
    return value;
  }
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
