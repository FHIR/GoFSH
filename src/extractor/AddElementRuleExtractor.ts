import { isEmpty } from 'lodash';
import { ProcessableElementDefinition, ProcessableStructureDefinition } from '../processor';
import { ExportableAddElementRule, ExportableOnlyRule } from '../exportable';
import { getPath, logger } from '../utils';
import { FlagRuleExtractor } from '.';
import { OnlyRuleExtractor } from './OnlyRuleExtractor';

export class AddElementRuleExtractor {
  static process(
    input: ProcessableElementDefinition,
    structDef: ProcessableStructureDefinition
  ): [ExportableAddElementRule, ExportableOnlyRule?] {
    const addElementRule = new ExportableAddElementRule(getPath(input));
    // we always have cardinality
    // don't use CardRuleExtractor here, since that has extra logic
    // that we don't want to use.
    addElementRule.min = input.min;
    addElementRule.max = input.max;
    input.processedPaths.push('min', 'max');
    const [onlyRule, codeableReferenceRule] = OnlyRuleExtractor.process(input);
    // when defining a new element with a CodeableReference type and specific targets,
    // the allowed targets must always be defined with an extra rule.
    // however, normal processing only returns an extra rule for choice elements.
    // so, if there is exactly one type, and it is CodeableReference, and there are targets,
    // make the extra rule.
    let extraOnlyRule: ExportableOnlyRule;
    if (
      input.type?.length === 1 &&
      input.type[0].code === 'CodeableReference' &&
      input.type[0].targetProfile?.length > 0
    ) {
      extraOnlyRule = onlyRule;
      addElementRule.types = [{ type: 'CodeableReference' }];
    } else {
      extraOnlyRule = codeableReferenceRule;
      addElementRule.types = onlyRule?.types ?? [];
    }
    if (input.contentReference) {
      if (isEmpty(addElementRule.types)) {
        addElementRule.contentReference = input.contentReference;
      } else {
        logger.warn(
          `Found types and contentReference for element ${input.id} in ${structDef.name}. The contentReference will be ignored.`
        );
      }
      input.processedPaths.push('contentReference');
    }
    // if types and contentReference were missing, default to BackboneElement
    if (isEmpty(addElementRule.types) && isEmpty(addElementRule.contentReference)) {
      addElementRule.types = [{ type: 'BackboneElement' }];
      logger.warn(
        `No types or contentReference found for element ${input.id} in ${structDef.name}. Defaulting to BackboneElement.`
      );
    }
    // we might have flags, so use FlagRuleExtractor
    const flagRule = FlagRuleExtractor.process(input);
    if (flagRule) {
      Object.assign(addElementRule, flagRule);
    }
    // we might have short and definition
    if (input.short) {
      addElementRule.short = input.short;
      input.processedPaths.push('short');
    }
    if (input.definition) {
      addElementRule.definition = input.definition;
      input.processedPaths.push('definition');
    }
    if (extraOnlyRule != null) {
      return [addElementRule, extraOnlyRule];
    } else {
      return [addElementRule];
    }
  }
}
