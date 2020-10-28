import { fhirdefs, utils } from 'fsh-sushi';
import { cloneDeep, isEqual, differenceWith } from 'lodash';
import { ProcessableElementDefinition } from '../processor';
import { ExportableCaretValueRule } from '../exportable';
import { getFSHValue, getPath, getPathValuePairs, logger } from '../utils';

export class CaretValueRuleExtractor {
  static process(
    input: ProcessableElementDefinition,
    fhir: fhirdefs.FHIRDefinitions
  ): ExportableCaretValueRule[] {
    // Convert to json to remove extra private properties on fhirtypes.ElementDefinition
    const path = getPath(input);
    const inputJSON = input.toJSON();
    input.processedPaths.push('id', 'path');
    const flatElement = getPathValuePairs(inputJSON);
    const caretValueRules: ExportableCaretValueRule[] = [];
    const remainingPaths = Object.keys(flatElement).filter(p => !input.processedPaths.includes(p));
    remainingPaths.forEach(key => {
      const caretValueRule = new ExportableCaretValueRule(path);
      caretValueRule.caretPath = key;
      caretValueRule.value = getFSHValue(key, flatElement[key], input, fhir);
      caretValueRules.push(caretValueRule);
    });
    return caretValueRules;
  }

  static processStructureDefinition(
    input: any,
    fhir: fhirdefs.FHIRDefinitions
  ): ExportableCaretValueRule[] {
    // Clone the input so we can modify it for simpler comparison
    const sd = cloneDeep(input);
    // Clone the parent so we can modify it for simpler comparison
    let parent = cloneDeep(
      fhir.fishForFHIR(
        input.baseDefinition,
        utils.Type.Resource,
        utils.Type.Type,
        utils.Type.Profile,
        utils.Type.Extension
      )
    );

    if (parent == null) {
      // We can't reliably export caret rules when we can't find the parent, but keep going
      // because we should still export the properties that SUSHI clears from the parent anyway
      // (properties that should always be exported).
      logger.warn(
        `Cannot reliably export top-level caret rules for ${sd.name} because GoFSH cannot find a ` +
          `definition for its parent: ${sd.baseDefinition}. If its parent is from another IG, ` +
          'run GoFSH again declaring that IG as a dependency.'
      );
      parent = cloneDeep(sd);
    }

    // Remove properties that are covered by other extractors or keywords
    IGNORED_PROPERTIES.forEach(prop => {
      delete sd[prop];
      delete parent[prop];
    });

    // If text exists and is generated, ignore it
    if (sd.text?.status === 'generated') {
      delete sd.text;
      delete parent.text;
    }

    // Remove properties from the parent that SUSHI clears before creating a profile. This
    // ensures that caret value rules will be exported even if the value is the same as the
    // parent (since SUSHI does not inherit these specific properties from the parent).
    // TODO: SUSHI should export the list of cleared properties or export a function that
    // clears them.
    CLEARED_PROPERTIES.forEach(prop => delete parent[prop]);

    // Massage data to support arrays as best as possible. Unfortunately, FSH does not provide
    // full support for array manipulation. You cannot clear arrays, delete elements, replace
    // arrays, or append elements (unless you know the length). This makes things tricky for
    // GoFSH. For now we do the best we can, which is:
    // 1. If SD array and parent array are equal, do nothing (rely on inheritance)
    // 2. If SD array is subset of parent array, do nothing (FSH can't delete elements)
    // 3. If SD array is same length as parent array, but some elements differ, or if SD array
    //    is larger than the parent array:
    //    a. if extension or modifier extension, output caret rules for the whole array, because
    //       SUSHI modifies those arrays itself before applying rules, so the indexes might be off
    //    b. otherwise output caret rules only for changed/added elements
    // To accomplish this, it's easier to manipulate the sd and parent JSON before flattening.
    // NOTE: This is only concerned w/ arrays at the top-level.
    Object.keys(sd).forEach(key => {
      if (Array.isArray(sd[key]) && sd[key].length) {
        let hasNewItems;
        if (Array.isArray(parent[key])) {
          const newItems = differenceWith(sd[key], parent[key], isEqual);
          hasNewItems = newItems.length > 0;
        } else {
          hasNewItems = true;
        }
        if (hasNewItems && (key === 'extension' || key === 'modifierExtension')) {
          // delete the items from the parent array, forcing the whole sd array to be exported
          delete parent[key];
        } else if (!hasNewItems) {
          // delete it from the SD so we won't create a caret rule for it even if it is a subset
          delete sd[key];
        }
      }
    });

    const caretValueRules: ExportableCaretValueRule[] = [];
    const flatSD = getPathValuePairs(sd);
    const flatParent = getPathValuePairs(parent);
    Object.keys(flatSD).forEach(key => {
      if (flatParent[key] == null || !isEqual(flatSD[key], flatParent[key])) {
        const caretValueRule = new ExportableCaretValueRule('');
        caretValueRule.caretPath = key;
        caretValueRule.value = getFSHValue(
          key,
          flatSD[key],
          fhir.fishForFHIR('StructureDefinition', utils.Type.Resource),
          fhir
        );
        caretValueRules.push(caretValueRule);
      }
    });

    return caretValueRules;
  }
}

// The properties that are handled via keywords and other extractors
const IGNORED_PROPERTIES = [
  'resourceType',
  'id',
  'url', // NOTE: For now, we assume URL matches canonical and is generated
  'name',
  'title',
  'description',
  'fhirVersion',
  'mapping',
  'baseDefinition',
  'derivation',
  'snapshot',
  'differential'
];

// The properties that SUSHI clears before creating a profile
const CLEARED_PROPERTIES = [
  'meta',
  'implicitRules',
  'language',
  'text',
  'contained',
  'identifier',
  'experimental',
  'date',
  'publisher',
  'contact',
  'useContext',
  'jurisdiction',
  'purpose',
  'copyright',
  'keyword'
];
