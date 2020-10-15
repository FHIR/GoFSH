import { Package } from '../processor';
import { ExportableConfiguration } from '../exportable';
import { CaretValueRule } from 'fsh-sushi/dist/fshtypes/rules';
import { countBy, toPairs, maxBy } from 'lodash';

export class ConfigurationExtractor {
  static process(resources: Package): ExportableConfiguration {
    const canonical = ConfigurationExtractor.inferCanonical(resources);
    const config = new ExportableConfiguration({
      canonical: canonical,
      fhirVersion: ['4.0.1']
    });
    return config;
  }

  static inferCanonical(resources: Package): string {
    // url may be present as a CaretValueRule, path = '', caret path = 'url'
    const potentialCanonicals: string[] = [];
    [...resources.profiles, ...resources.extensions].forEach(resource => {
      const urlRule = resource.rules.find(rule => {
        return rule instanceof CaretValueRule && rule.path === '' && rule.caretPath === 'url';
      }) as CaretValueRule;
      if (urlRule) {
        potentialCanonicals.push(
          urlRule.value.toString().replace(/\/StructureDefinition\/[^/]+$/, '')
        );
      }
    });
    resources.valueSets.forEach(valueSet => {
      const urlRule = valueSet.rules.find(rule => {
        return rule instanceof CaretValueRule && rule.path === '' && rule.caretPath === 'url';
      }) as CaretValueRule;
      if (urlRule) {
        potentialCanonicals.push(urlRule.value.toString().replace(/\/ValueSet\/[^/]+$/, ''));
      }
    });
    resources.codeSystems.forEach(codeSystem => {
      const urlRule = codeSystem.rules.find(rule => {
        return rule instanceof CaretValueRule && rule.path === '' && rule.caretPath === 'url';
      }) as CaretValueRule;
      if (urlRule) {
        potentialCanonicals.push(urlRule.value.toString().replace(/\/CodeSystem\/[^/]+$/, ''));
      }
    });

    if (potentialCanonicals.length > 0) {
      return maxBy(toPairs(countBy(potentialCanonicals)), pair => pair[1])[0];
    } else {
      return '';
    }
  }
}
