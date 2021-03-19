import { fshrules, fhirtypes, utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableCaretValueRule } from '../../exportable';

const singletonArrayElements: Map<string, fhirtypes.PathPart[]> = new Map();

export default {
  name: 'simplify_array_indexing',
  description: 'Replace numeric indices with soft indexing',
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
      const parsedRules = ruleArr.map((rule: fshrules.Rule) => {
        const parsedPath: { path: fhirtypes.PathPart[]; caretPath?: fhirtypes.PathPart[] } = {
          path: utils.parseFSHPath(rule.path)
        };
        // If we have a CaretValueRule, we'll need a second round of parsing for the caret path
        if (rule instanceof ExportableCaretValueRule) {
          parsedPath.caretPath = utils.parseFSHPath(rule.caretPath);
        }
        return parsedPath;
      });

      parsedRules.forEach((parsedRule: any, ruleIndex: number) => {
        const originalRule = def.rules[ruleIndex];
        parsedRule.path.forEach((element: fhirtypes.PathPart, elementIndex: number) => {
          // Add a prefix to the current element containing previously parsed rule elements
          element.prefix = utils.assembleFSHPath(parsedRule.path.slice(0, elementIndex));
          applySoftIndexing(element, pathMap);
        });

        parsedRule.caretPath?.forEach((element: fhirtypes.PathPart, elementIndex: number) => {
          // Caret path indexes should only be resolved in the context of a specific path
          // Each normal path has a separate map to keep track of the caret path indexes
          if (!caretPathMap.has(originalRule.path)) {
            caretPathMap.set(originalRule.path, new Map());
          }

          const elementCaretPathMap = caretPathMap.get(originalRule.path);
          // Add a prefix to the current element containing previously parsed rule elements
          element.prefix = utils.assembleFSHPath(parsedRule.caretPath.slice(0, elementIndex));
          applySoftIndexing(element, elementCaretPathMap);
        });
      });

      removeZeroIndices();

      parsedRules.forEach((parsedRule: any, ruleIndex: number) => {
        const originalRule = def.rules[ruleIndex];
        originalRule.path = utils.assembleFSHPath(parsedRule.path);
        if (originalRule instanceof ExportableCaretValueRule) {
          originalRule.caretPath = utils.assembleFSHPath(parsedRule.caretPath);
        }
      });
    });
  }
} as OptimizerPlugin;

/**
 *
 * @param {PathPart} element - A single element in a rules path
 * @param {Map<string, number} pathMap - A map containing an element's name as the key and that element's updated index as the value
 */
function applySoftIndexing(element: fhirtypes.PathPart, pathMap: Map<string, number>) {
  // Must account for a pathPart's base name, prior portions of the path, as well as any slices it's contained in.
  const mapName = `${element.prefix ?? ''}.${element.base}|${(element.slices ?? []).join('|')}`;
  const indexRegex = /^[0-9]+$/;

  const currentNumericBracket = element.brackets?.find(bracket => indexRegex.test(bracket));
  if (!currentNumericBracket) return; // If the element is not an array, exit the function

  const bracketIndex = element.brackets.indexOf(currentNumericBracket);

  if (!pathMap.has(mapName)) {
    pathMap.set(mapName, parseInt(currentNumericBracket));
    // If the element contains a zero Index, we'll flag the rule to have the index removed
    if (currentNumericBracket === '0') singletonArrayElements.set(mapName, [element]);
  } else {
    const previousNumericIndex = pathMap.get(mapName);
    if (parseInt(currentNumericBracket) === previousNumericIndex + 1) {
      if (previousNumericIndex === 0) singletonArrayElements.delete(mapName);
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

function removeZeroIndices() {
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
