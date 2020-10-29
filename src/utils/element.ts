import { flatten } from 'flat';
import { fhirtypes, fshtypes, utils } from 'fsh-sushi';
import { fshifyString } from '../exportable/common';
import { ProcessableElementDefinition, ProcessableStructureDefinition } from '../processor';
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
  value: number | string | boolean,
  input: ProcessableElementDefinition | any,
  fisher: utils.Fishable
) {
  let definition: StructureDefinition;
  // NOTE: Need to check instanceof ElementDefinition (not ProcessableElementDefinition)
  // because, in fact, ProcessableElementDefinition.fromJSON really returns an ElementDefinition.
  // TODO: Fix this when SUSHI supports fromJSON w/ ElementDefinition subclasses
  if (input instanceof ElementDefinition) {
    definition = input.getOwnStructureDefinition(fisher);
  } else {
    definition = StructureDefinition.fromJSON(
      fisher.fishForFHIR('StructureDefinition', utils.Type.Resource)
    );
  }
  // Finding element by path works without array information
  const element = definition.findElementByPath(key.replace(/\[\d+\]/g, ''), fisher);
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
