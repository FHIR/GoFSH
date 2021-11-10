import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableAssignmentRule, ExportableContainsRule } from '../../exportable';
import { logger } from '../../utils';
import { pullAt } from 'lodash';
import { isUri } from 'valid-url';
import { utils } from 'fsh-sushi';

// Loop over all profiles and extensions, removing assignment rules on inline extensions
// NOTE: Inline extensions on a profile are allowed by SUSHI, but they are technically not
// valid FHIR and the IG Publisher does not like this
export default {
  name: 'remove_extension_url_assignment_rules',
  description:
    'Remove assignment rules on inline extension "url" paths since SUSHI automatically applies these',

  optimize(pkg: Package, fisher: utils.Fishable): void {
    [...pkg.profiles, ...pkg.extensions].forEach(sd => {
      const rulesToRemove: number[] = [];
      sd.rules.forEach(rule => {
        if (rule instanceof ExportableContainsRule && /(modifierE|e)xtension$/.test(rule.path)) {
          rule.items.forEach(item => {
            const assignmentRuleIdx = sd.rules.findIndex(
              other =>
                other instanceof ExportableAssignmentRule &&
                other.path === `${rule.path}[${item.name}].url`
            );
            if (assignmentRuleIdx >= 0) {
              rulesToRemove.push(assignmentRuleIdx);
              const urlRule = sd.rules[assignmentRuleIdx] as ExportableAssignmentRule;
              if (!item.type && isUri(urlRule.value as string)) {
                item.type = fisher.fishForMetadata(
                  urlRule.value as string,
                  utils.Type.Extension
                )?.name;
                if (item.type) {
                  logger.error(
                    `${sd.name}: Extension at "${rule.path}[${item.name}]" refers to ${urlRule.value} but does not set this value in type.profile. ` +
                      'The generated "contains" rule will be updated to use the "named" syntax so that SUSHI can process it without error. ' +
                      'This will cause type.profile to be set on the SUSHI output, which is likely the desired behavior. If this is not desired, ' +
                      'the generated FSH will have to be manually updated.'
                  );
                }
              } else if (urlRule.value !== item.name) {
                logger.error(
                  `${sd.name}: Inline extension at "${rule.path}[${item.name}]" has sliceName "${item.name}" but "${urlRule.value}" is assigned to url. ` +
                    'SUSHI requires that these values match exactly, so the value assigned to the url will be used as the sliceName.'
                );
                // If the value set by the url rule and the sliceName do not match, prefer the value set by the url rule
                // and replace all occurrences of the old sliceName in other rules
                const newSliceName = urlRule.value as string;
                [...sd.rules, ...rule.cardRules, ...rule.flagRules].forEach(r => {
                  r.path = r.path.replace(
                    new RegExp(`^${rule.path}\\[${item.name}\\]`),
                    `${rule.path}[${newSliceName}]`
                  );
                });

                item.name = newSliceName;
              }
            }
          });
        }
      });
      pullAt(sd.rules, rulesToRemove);
    });
    // We must know the configuration to determine if a rule assigning "url" matches the url that SUSHI will assume
    if (pkg.configuration?.config?.canonical) {
      pkg.extensions.forEach(extension => {
        const rulesToRemove: number[] = [];
        extension.rules.forEach((rule, i) => {
          if (
            rule instanceof ExportableAssignmentRule &&
            rule.path === 'url' &&
            rule.value ===
              `${pkg.configuration.config.canonical}/StructureDefinition/${extension.id}`
          ) {
            rulesToRemove.push(i);
          }
        });
        pullAt(extension.rules, rulesToRemove);
      });
    }
  }
} as OptimizerPlugin;
