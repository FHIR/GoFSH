import { utils, fhirtypes, fshtypes } from 'fsh-sushi';
import { capitalize, compact, difference } from 'lodash';
import { flatten } from 'flat';
import { ExportableValueSet } from '../exportable';
import {
  ValueSetConceptComponentRuleExtractor,
  ValueSetFilterComponentRuleExtractor,
  CaretValueRuleExtractor
} from '../extractor';
import { makeNameSushiSafe } from './common';

const SUPPORTED_COMPONENT_PATHS = [
  'system',
  'version',
  'concept',
  'filter',
  'filter.property',
  'filter.op',
  'filter.value',
  'valueSet'
];

export class ValueSetProcessor {
  static extractKeywords(input: ProcessableValueSet, target: ExportableValueSet): void {
    if (input.id) {
      target.id = input.id;
    }
    if (input.title) {
      target.title = input.title;
    }
    if (input.description) {
      target.description = input.description;
    }
  }

  static extractRules(
    input: ProcessableValueSet,
    target: ExportableValueSet,
    fisher: utils.Fishable,
    config: fshtypes.Configuration
  ): void {
    const newRules: ExportableValueSet['rules'] = [];
    newRules.push(
      ...CaretValueRuleExtractor.processResource(input, fisher, input.resourceType, config)
    );
    if (input.compose) {
      input.compose.include?.forEach((vsComponent: fhirtypes.ValueSetComposeIncludeOrExclude) => {
        newRules.push(ValueSetFilterComponentRuleExtractor.process(vsComponent, input, true));
        newRules.push(ValueSetConceptComponentRuleExtractor.process(vsComponent, true));
        vsComponent.concept?.forEach(includedConcept => {
          const conceptCaretRules = CaretValueRuleExtractor.processConcept(
            includedConcept,
            [`${vsComponent.system ?? ''}#${includedConcept.code}`],
            target.name,
            'ValueSet',
            fisher
          );
          newRules.push(...conceptCaretRules);
        });
      });
      input.compose.exclude?.forEach((vsComponent: fhirtypes.ValueSetComposeIncludeOrExclude) => {
        newRules.push(ValueSetFilterComponentRuleExtractor.process(vsComponent, input, false));
        newRules.push(ValueSetConceptComponentRuleExtractor.process(vsComponent, false));
        vsComponent.concept?.forEach(excludedConcept => {
          const conceptCaretRules = CaretValueRuleExtractor.processConcept(
            excludedConcept,
            [`${vsComponent.system ?? ''}#${excludedConcept.code}`],
            target.name,
            'ValueSet',
            fisher
          );
          newRules.push(...conceptCaretRules);
        });
      });
    }
    target.rules = compact(newRules);
  }

  static process(
    input: any,
    fisher: utils.Fishable,
    config: fshtypes.Configuration
  ): ExportableValueSet {
    // It must be representable using the FSH ValueSet syntax
    if (ValueSetProcessor.isProcessableValueSet(input)) {
      // Prefer name (which is optional), otherwise create a reasonable name from the id with only allowable characters
      const name = input.name ?? input.id.split(/[-.]+/).map(capitalize).join('');
      const valueSet = new ExportableValueSet(name);
      ValueSetProcessor.extractKeywords(input, valueSet);
      ValueSetProcessor.extractRules(input, valueSet, fisher, config);
      makeNameSushiSafe(valueSet);
      return valueSet;
    }
  }

  // Ensures that a ValueSet instance is fully representable using the ValueSet syntax in FSH.
  // For example, if there is no name or id we cannot process it.  In addition, if compose.include
  // or compose.exclude have extensions, or concepts have designations, etc., then we can't
  // represent it in FSH ValueSet syntax.  It must be represented using Instance instead.
  // NOTE: by FHIR spec, if the include list exists, it must contain at least one element
  // but we can still do some processing without that as long as other criteria holds.
  // See http://hl7.org/fhir/r4/valueset-definitions.html#ValueSet.compose.include
  static isProcessableValueSet(input: any): input is ProcessableValueSet {
    if (input.resourceType !== 'ValueSet' || (input.name == null && input.id == null)) {
      return false;
    }
    // We support all higher-level paths via caret rules.  We only need to worry about the
    // input.compose.include and input.compose.exclude components because there is no easy way
    // to associate caret rules with them when the special FSH include/exclude syntax is used.
    // First get the flat paths of input.compose.include and input.compose.exclude
    let flatPaths = Object.keys(
      flatten([...(input.compose?.include ?? []), ...(input.compose?.exclude ?? [])])
    );
    // Remove the array indices from the paths (we don't care about them)
    flatPaths = flatPaths.map(p => {
      return p
        .split('.')
        .filter(k => isNaN(parseInt(k)))
        .join('.');
    });
    // any path that starts with "concept." is okay, since those can use code caret rules
    flatPaths = flatPaths.filter(p => !p.startsWith('concept.'));
    // Check if there are any paths that are not a supported path
    return difference(flatPaths, SUPPORTED_COMPONENT_PATHS).length === 0;
  }
}

export interface ProcessableValueSet {
  resourceType?: 'ValueSet';
  name?: string;
  id?: string;
  title?: string;
  description?: string;
  compose?: fhirtypes.ValueSetCompose;
}
