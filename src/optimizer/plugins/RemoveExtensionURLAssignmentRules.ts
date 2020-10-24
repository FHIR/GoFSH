import { OptimizerPlugin } from '../OptimizerPlugin';
import { Package } from '../../processor';
import { ExportableAssignmentRule, ExportableContainsRule } from '../../exportable';
import { pullAt } from 'lodash';

// Loop over all profiles and extensions, removing assignment rules on inline extensions
// NOTE: Inline extensions on a profile are allowed by SUSHI, but they are technically not
// valid FHIR and the IG Publisher does not like this
export default {
  name: 'remove_extension_url_assignment_rules',
  description:
    'Remove assignment rules on inline extension "url" paths since SUSHI automatically applies these',

  optimize(pkg: Package): void {
    [...pkg.profiles, ...pkg.extensions].forEach(sd => {
      const rulesToRemove: number[] = [];
      sd.rules.forEach(rule => {
        if (rule instanceof ExportableContainsRule && /(modifierE|e)xtension$/.test(rule.path)) {
          rule.items.forEach(item => {
            const assignmentRuleIdx = sd.rules.findIndex(
              other =>
                other instanceof ExportableAssignmentRule &&
                other.path === `${rule.path}[${item.name}].url` &&
                other.value === item.name
            );
            if (assignmentRuleIdx >= 0) {
              rulesToRemove.push(assignmentRuleIdx);
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
