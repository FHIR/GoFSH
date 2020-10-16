import { countBy, toPairs, maxBy, capitalize } from 'lodash';
import { ImplementationGuideStatus } from 'fsh-sushi/dist/fhirtypes/ImplementationGuide';
import { Package } from '../processor';
import { ExportableConfiguration, ExportableCaretValueRule, ExportableRule } from '../exportable';
import { fshtypes } from 'fsh-sushi';

export class ConfigurationExtractor {
  static canonicalRegex = /^https?:\/\/(\w+)\.[\w.]+\/(.*)$/;

  static process(resources: Package): ExportableConfiguration {
    // canonical and fhirVersion are required elements in configuration
    const canonical = ConfigurationExtractor.inferCanonical(resources);
    const fhirVersion = ConfigurationExtractor.inferString(resources, 'fhirVersion');
    const config = new ExportableConfiguration({
      canonical: canonical,
      fhirVersion: [fhirVersion]
    });
    // infer id and name using canonical
    const canonicalMatch = canonical.match(ConfigurationExtractor.canonicalRegex);
    if (canonicalMatch) {
      const idParts = [canonicalMatch[1], ...canonicalMatch[2].split('/')];
      config.config.id = idParts.join('.');
      config.config.name = idParts.map(capitalize).join('');
    }
    // infer status and version from most common values
    const status = ConfigurationExtractor.inferString(
      resources,
      'status'
    ) as ImplementationGuideStatus;
    const version = ConfigurationExtractor.inferString(resources, 'version');
    if (status) {
      config.config.status = status;
    }
    if (version) {
      config.config.version = version;
    }
    return config;
  }

  static inferCanonical(resources: Package): string {
    // url may be present as a CaretValueRule, path = '', caret path = 'url'
    const potentialCanonicals: string[] = [];
    [...resources.profiles, ...resources.extensions].forEach(resource => {
      const urlRule = resource.rules.find(rule => {
        return (
          rule instanceof ExportableCaretValueRule && rule.path === '' && rule.caretPath === 'url'
        );
      }) as ExportableCaretValueRule;
      if (urlRule) {
        potentialCanonicals.push(
          urlRule.value.toString().replace(/\/StructureDefinition\/[^/]+$/, '')
        );
      }
    });
    resources.valueSets.forEach(valueSet => {
      const urlRule = valueSet.rules.find(rule => {
        return (
          rule instanceof ExportableCaretValueRule && rule.path === '' && rule.caretPath === 'url'
        );
      }) as ExportableCaretValueRule;
      if (urlRule) {
        potentialCanonicals.push(urlRule.value.toString().replace(/\/ValueSet\/[^/]+$/, ''));
      }
    });
    resources.codeSystems.forEach(codeSystem => {
      const urlRule = codeSystem.rules.find(rule => {
        return (
          rule instanceof ExportableCaretValueRule && rule.path === '' && rule.caretPath === 'url'
        );
      }) as ExportableCaretValueRule;
      if (urlRule) {
        potentialCanonicals.push(urlRule.value.toString().replace(/\/CodeSystem\/[^/]+$/, ''));
      }
    });

    return ConfigurationExtractor.getStringMode(potentialCanonicals);
  }

  static inferString(resources: Package, caretPath: string): string {
    const potentialStrings: string[] = [];
    [
      ...resources.profiles,
      ...resources.extensions,
      ...resources.valueSets,
      ...resources.codeSystems
    ].forEach(resource => {
      const caretRule = (resource.rules as ExportableRule[]).find(rule => {
        return (
          rule instanceof ExportableCaretValueRule &&
          rule.path === '' &&
          rule.caretPath === caretPath
        );
      }) as ExportableCaretValueRule;
      if (caretRule) {
        // if we find a FshCode, we only want the "code" part
        if (caretRule.value instanceof fshtypes.FshCode) {
          potentialStrings.push(caretRule.value.code);
        } else {
          potentialStrings.push(caretRule.value.toString());
        }
      }
    });
    return ConfigurationExtractor.getStringMode(potentialStrings);
  }

  private static getStringMode(potentials: string[]): string {
    if (potentials.length > 0) {
      return maxBy(toPairs(countBy(potentials)), pair => pair[1])[0];
    } else {
      return '';
    }
  }
}
