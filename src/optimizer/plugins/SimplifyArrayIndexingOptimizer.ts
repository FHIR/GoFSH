import { fshrules, fhirtypes, utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableCaretValueRule } from '../../exportable';

export default {
  name: 'simplify_array_indexing',
  description: 'Replace numeric indices with soft indexing',
  runAfter: [new RegExp(/.*/)],
  optimize(pkg: Package): void {
    // If there is only a single element in an array, include no indices at all
    // If there is more than one element in an array, reference the first element with
    // a '0' and subsequent elements with soft indexing
    [
      ...pkg.profiles,
      ...pkg.extensions,
      ...pkg.valueSets,
      ...pkg.codeSystems,
      ...pkg.instances,
      ...pkg.mappings
    ].forEach(def => {
      const pathMap: Map<string, number> = new Map();
      const caretPathMap: Map<string, Map<string, number>> = new Map();
      const ruleArr: fshrules.Rule[] = def.rules;
      const singletonArrayElements: Map<string, fhirtypes.PathPart[]> = new Map();
      const parsedPaths = ruleArr.map((rule: fshrules.Rule) => {
        const parsedPath: { path: fhirtypes.PathPart[]; caretPath?: fhirtypes.PathPart[] } = {
          path: utils.parseFSHPath(rule.path)
        };
        // If we have a CaretValueRule, we'll need a second round of parsing for the caret path
        if (rule instanceof ExportableCaretValueRule) {
          parsedPath.caretPath = utils.parseFSHPath(rule.caretPath);
        }
        return parsedPath;
      });
      parsedPaths.forEach(rule => {
        addPrefixes(rule.path);
        if (rule.caretPath) {
          addPrefixes(rule.caretPath);
        }
      });

      parsedPaths.forEach((parsedRule: any, ruleIndex: number) => {
        const originalRule = def.rules[ruleIndex];
        parsedRule.path.forEach((element: fhirtypes.PathPart) => {
          applySoftIndexing(element, pathMap, singletonArrayElements);
        });

        parsedRule.caretPath?.forEach((element: fhirtypes.PathPart) => {
          // Caret path indexes should only be resolved in the context of a specific path
          // Each normal path has a separate map to keep track of the caret path indexes
          if (!caretPathMap.has(originalRule.path)) {
            caretPathMap.set(originalRule.path, new Map());
          }

          const elementCaretPathMap = caretPathMap.get(originalRule.path);
          applySoftIndexing(element, elementCaretPathMap, singletonArrayElements);
        });
      });

      removeZeroIndices(singletonArrayElements);

      parsedPaths.forEach((parsedRule: any, ruleIndex: number) => {
        const originalRule = def.rules[ruleIndex];
        originalRule.path = utils.assembleFSHPath(parsedRule.path);
        if (originalRule instanceof ExportableCaretValueRule) {
          originalRule.caretPath = utils.assembleFSHPath(parsedRule.caretPath);
        }
      });
      singletonArrayElements.clear();
    });
  }
} as OptimizerPlugin;

/**
 * Populates each PathPart in an array of PathParts with a prefix containing the assembled path up to that element
 * @param { path: PathPart[] } parsedPath - An array of PathParts
 */
function addPrefixes(parsedPath: fhirtypes.PathPart[]) {
  parsedPath.forEach((element: fhirtypes.PathPart, elementIndex: number) => {
    // Add a prefix to the current element containing previously parsed rule elements
    element.prefix = utils.assembleFSHPath(parsedPath.slice(0, elementIndex));
  });
}

/**
 * Converts numeric indeces on a PathPart into soft indexing characters
 * @param {PathPart} element - A single element in a rules path
 * @param {Map<string, number} pathMap - A map containing an element's name as the key and that element's updated index as the value
 * @param {Map<string, PathPart[]} singletonArrayElements - A map containing a string unique to each element of type array as the key, and an array of PathParts as the value
 */
function applySoftIndexing(
  element: fhirtypes.PathPart,
  pathMap: Map<string, number>,
  singletonArrayElements: Map<string, fhirtypes.PathPart[]>
) {
  // Must account for a pathPart's base name, prior portions of the path, as well as any slices it's contained in.
  const mapName = `${element.prefix ?? ''}.${element.base}|${(element.slices ?? []).join('|')}`;
  const indexRegex = /^[0-9]+$/;

  const currentNumericBracket = element.brackets?.find(bracket => indexRegex.test(bracket));
  if (!currentNumericBracket) return; // If the element is not an array, exit the function

  const bracketIndex = element.brackets.indexOf(currentNumericBracket);

  if (!pathMap.has(mapName)) {
    pathMap.set(mapName, parseInt(currentNumericBracket));
    // If the element contains a zero Index, we'll flag the rule to have the index removed
    if (currentNumericBracket === '0') {
      singletonArrayElements.set(mapName, [element]);
    }
  } else {
    const previousNumericIndex = pathMap.get(mapName);
    if (parseInt(currentNumericBracket) === previousNumericIndex + 1) {
      if (previousNumericIndex === 0) {
        singletonArrayElements.delete(mapName);
      }
      element.brackets[bracketIndex] = '+';
      pathMap.set(mapName, previousNumericIndex + 1);
    } else if (parseInt(currentNumericBracket) === previousNumericIndex) {
      element.brackets[bracketIndex] = '=';
      if (currentNumericBracket === '0') {
        // If the element contains a zero Index, we'll flag the rule to have the index removed
        singletonArrayElements.get(mapName).push(element);
      }
    } else {
      singletonArrayElements.delete(mapName);
    }
  }
}

/**
 * Removes '[0]' and '[=]' indexing from elements with a single value in their array
 * @param {Map<string, PathPart[]} singletonArrayElements - A map containing a string unique to each element of type array as the key, and an array of PathParts as the value
 */
function removeZeroIndices(singletonArrayElements: Map<string, fhirtypes.PathPart[]>) {
  const redundantElementGroups = Array.from(singletonArrayElements.values());
  redundantElementGroups.forEach(cluster => {
    cluster.forEach(pathPart => {
      if (pathPart.brackets.includes('0')) {
        const zeroIndex = pathPart.brackets.indexOf('0');
        delete pathPart.brackets[zeroIndex];
      }
      if (pathPart.brackets.includes('=')) {
        const equalsIndex = pathPart.brackets.indexOf('=');
        delete pathPart.brackets[equalsIndex];
      }
    });
  });
}
