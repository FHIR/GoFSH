import { isEmpty, isEqual } from 'lodash';
import { ExportableCaretValueRule, ExportableValueSetConceptComponentRule } from '../../exportable';
import { Package } from '../../processor';
import { OptimizerPlugin } from '../OptimizerPlugin';

// a ValueSetConceptComponentRule will print as multiple consecutive rules
// if there is a system, but no valuesets.
// normally, this is fine, but if more than one of those concepts has caret rules,
// split them manually so that the caret rules appear immediately after the concept. for example:
// * #BEAR from system http://example.org/zoo
// * #BEAR ^designation.value = "ourse"
// * #BEAR ^designation.language = #fr
// * #PEL from system http://example.org/zoo
// * #PEL ^designation.value = "pelícano"
// * #PEL ^designation.language = #es
export default {
  name: 'separate_concepts_with_caret_rules',
  description: 'Separate concepts in ValueSets from the same system if they also have caret rules.',
  runBefore: ['resolve_value_set_component_rule_urls'],
  optimize(pkg: Package): void {
    pkg.valueSets.forEach(vs => {
      const systemRulesToCheck = vs.rules.filter(rule => {
        return (
          rule instanceof ExportableValueSetConceptComponentRule &&
          rule.from.system != null &&
          isEmpty(rule.from.valueSets) &&
          rule.concepts.length > 1
        );
      }) as ExportableValueSetConceptComponentRule[];
      const allCodeCaretRules = vs.rules.filter(rule => {
        return rule instanceof ExportableCaretValueRule && rule.pathArray.length > 0;
      }) as ExportableCaretValueRule[];
      if (allCodeCaretRules.length > 0) {
        systemRulesToCheck.forEach(conceptRule => {
          // for each concept in the rule, see if there are any caret value rules.
          const caretRulesForSystem = new Map<string, ExportableCaretValueRule[]>();
          conceptRule.concepts.forEach(concept => {
            caretRulesForSystem.set(
              concept.code,
              allCodeCaretRules.filter(caretRule =>
                isEqual(caretRule.pathArray, [`${conceptRule.from.system ?? ''}#${concept.code}`])
              )
            );
          });
          if (caretRulesForSystem.size > 1) {
            // split apart the codes so that the ones with caret rules can be next to their concept rule
            const reorganizedRules: (
              | ExportableValueSetConceptComponentRule
              | ExportableCaretValueRule
            )[] = [];
            for (const concept of conceptRule.concepts) {
              const singleConceptRule = new ExportableValueSetConceptComponentRule(
                conceptRule.inclusion
              );
              singleConceptRule.from.system = conceptRule.from.system;
              singleConceptRule.concepts = [concept];
              // don't need to copy indent since it will always be 0
              reorganizedRules.push(singleConceptRule);
              for (const caretRule of caretRulesForSystem.get(concept.code)) {
                reorganizedRules.push(caretRule);
                vs.rules.splice(vs.rules.indexOf(caretRule), 1);
              }
            }
            const originalConceptRuleIndex = vs.rules.indexOf(conceptRule);
            vs.rules.splice(originalConceptRuleIndex, 1, ...reorganizedRules);
          }
        });
      }
    });
  }
} as OptimizerPlugin;
