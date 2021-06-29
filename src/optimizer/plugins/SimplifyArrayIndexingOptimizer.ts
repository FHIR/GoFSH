import { fshrules, fhirtypes, utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableCaretValueRule } from '../../exportable';
import _ from 'lodash';

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
      ...pkg.logicals,
      ...pkg.resources,
      ...pkg.valueSets,
      ...pkg.codeSystems,
      ...pkg.instances,
      ...pkg.mappings
    ].forEach(def => {
      const pathMap: Map<string, number> = new Map();
      const caretPathMap: Map<string, Map<string, number>> = new Map();
      const ruleArr: fshrules.Rule[] = def.rules;
      const parsedPaths = ruleArr.map((rule: fshrules.Rule) => {
        const parsedPath: { path: fhirtypes.PathPart[]; caretPath?: fhirtypes.PathPart[] } = {
          path: parseFSHPath(rule.path),
          caretPath: []
        };
        // If we have a CaretValueRule, we'll need a second round of parsing for the caret path
        if (rule instanceof ExportableCaretValueRule) {
          parsedPath.caretPath = parseFSHPath(rule.caretPath);
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
          applySoftIndexing(element, pathMap);
        });

        parsedRule.caretPath.forEach((element: fhirtypes.PathPart) => {
          // Caret path indexes should only be resolved in the context of a specific path
          // Each normal path has a separate map to keep track of the caret path indexes
          if (!caretPathMap.has(originalRule.path)) {
            caretPathMap.set(originalRule.path, new Map());
          }

          const elementCaretPathMap = caretPathMap.get(originalRule.path);
          applySoftIndexing(element, elementCaretPathMap);
        });
      });

      removeZeroIndices(parsedPaths);

      parsedPaths.forEach((parsedRule: any, ruleIndex: number) => {
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
function applySoftIndexing(element: fhirtypes.PathPart, pathMap: Map<string, number>) {
  // Must account for a pathPart's base name, prior portions of the path, as well as any slices it's contained in.
  const mapName = `${element.prefix ?? ''}.${element.base}|${(element.slices ?? []).join('|')}`;
  const indexRegex = /^[0-9]+$/;

  const currentNumericBracket = element.brackets?.find(bracket => indexRegex.test(bracket));
  if (!currentNumericBracket) return; // If the element is not an array, exit the function

  const bracketIndex = element.brackets.indexOf(currentNumericBracket);

  if (!pathMap.has(mapName)) {
    pathMap.set(mapName, parseInt(currentNumericBracket));
  } else {
    const previousNumericIndex = pathMap.get(mapName);
    if (parseInt(currentNumericBracket) === previousNumericIndex + 1) {
      element.brackets[bracketIndex] = '+';
      pathMap.set(mapName, previousNumericIndex + 1);
    } else if (parseInt(currentNumericBracket) === previousNumericIndex) {
      element.brackets[bracketIndex] = '=';
    } else {
      pathMap.set(mapName, parseInt(currentNumericBracket));
    }
  }
}

// TODO: remove once sushi has been released with fixes to the parseFSHPath function
function splitOnPathPeriods(path: string): string[] {
  return path.split(/\.(?![^\[]*\])/g); // match a period that isn't within square brackets
}

// TODO: remove once sushi has been released with fixes to the parseFSHPath function
export function parseFSHPath(fshPath: string): fhirtypes.PathPart[] {
  const pathParts: fhirtypes.PathPart[] = [];
  const seenSlices: string[] = [];
  const indexRegex = /^[0-9]+$/;
  const splitPath = fshPath === '.' ? [fshPath] : splitOnPathPeriods(fshPath);
  for (const pathPart of splitPath) {
    const splitPathPart = pathPart.split('[');
    if (splitPathPart.length === 1 || pathPart.endsWith('[x]')) {
      // There are no brackets, or the brackets are for a choice, so just push on the name
      pathParts.push({ base: pathPart });
    } else {
      // We have brackets, let's  save the bracket info
      let fhirPathBase = splitPathPart[0];
      // Get the bracket elements and slice off the trailing ']'
      let brackets = splitPathPart.slice(1).map(s => s.slice(0, -1));
      // Get rid of any remaining [x] elements in the brackets
      if (brackets[0] === 'x') {
        fhirPathBase += '[x]';
        brackets = brackets.slice(1);
      }
      brackets.forEach(bracket => {
        if (!indexRegex.test(bracket) && !(bracket === '+' || bracket === '=')) {
          seenSlices.push(bracket);
        }
      });
      if (seenSlices.length > 0) {
        pathParts.push({
          base: fhirPathBase,
          brackets: brackets,
          slices: [...seenSlices]
        });
      } else {
        pathParts.push({ base: fhirPathBase, brackets: brackets });
      }
    }
  }
  return pathParts;
}

// Removes '[0]' and '[=]' indexing from elements with a single value in their array
function removeZeroIndices(parsedPaths: any[]) {
  const regularPathElements = _.flatten(parsedPaths.map(rule => rule.path));
  const caretPathElements = _.flatten(parsedPaths.map(rule => rule.caretPath));

  const referencePathElements = _.cloneDeep(regularPathElements);
  const referenceCaretPathElements = _.cloneDeep(caretPathElements);

  regularPathElements.forEach((element: fhirtypes.PathPart) => {
    if (!element.brackets) {
      return;
    }
    const filteredElements = referencePathElements.filter(
      e =>
        e.base === element.base &&
        e.prefix === element.prefix &&
        e.brackets &&
        !(e.brackets.includes('0') || e.brackets.includes('='))
    );
    if (filteredElements.length === 0) {
      if (element.brackets.includes('0')) {
        const zeroIndex = element.brackets.indexOf('0');
        delete element.brackets[zeroIndex];
      }
      if (element.brackets.includes('=')) {
        const equalsIndex = element.brackets.indexOf('=');
        delete element.brackets[equalsIndex];
      }
    }
  });

  caretPathElements.forEach((element: fhirtypes.PathPart) => {
    if (!element.brackets) {
      return;
    }
    const filteredElements = referenceCaretPathElements.filter(
      e =>
        e.base === element.base &&
        e.prefix === element.prefix &&
        e.brackets &&
        !(e.brackets.includes('0') || e.brackets.includes('='))
    );
    if (filteredElements.length === 0) {
      if (element.brackets.includes('0')) {
        const zeroIndex = element.brackets.indexOf('0');
        delete element.brackets[zeroIndex];
      }
      if (element.brackets.includes('=')) {
        const equalsIndex = element.brackets.indexOf('=');
        delete element.brackets[equalsIndex];
      }
    }
  });
}
