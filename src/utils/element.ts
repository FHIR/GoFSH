import { flatten } from 'flat';
import { fhirdefs, fhirtypes, fshtypes } from 'fsh-sushi';
import { fshifyString } from '../exportable/common';
import { ProcessableElementDefinition } from '../processor';

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
  input: ProcessableElementDefinition,
  fhir: fhirdefs.FHIRDefinitions
) {
  const element = input
    .getOwnStructureDefinition(fhir)
    // Finding element by path works without array information
    .findElementByPath(key.replace(/\[\d+\]/g, ''), fhir);
  if (element?.type?.[0]?.code === 'code') {
    return new fshtypes.FshCode(value.toString());
  }
  return typeof value === 'string' ? fshifyString(value) : value;
}
