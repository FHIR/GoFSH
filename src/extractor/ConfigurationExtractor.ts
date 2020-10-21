import { countBy, toPairs, maxBy, capitalize, filter } from 'lodash';
import { fshtypes, fhirtypes } from 'fsh-sushi';
import { Package } from '../processor';
import { ExportableConfiguration, ExportableCaretValueRule, ExportableRule } from '../exportable';

type ImplementationGuideStatus = fhirtypes.ImplementationGuideStatus;
const { FshCode } = fshtypes;

export class ConfigurationExtractor {
  static process(resources: Package): ExportableConfiguration {
    // canonical and fhirVersion are required elements in configuration, so they get defaults
    const canonical = ConfigurationExtractor.inferCanonical(resources) || 'http://sample.org';
    const fhirVersion = ConfigurationExtractor.inferString(resources, 'fhirVersion') || '4.0.1';
    const config = new ExportableConfiguration({
      canonical: canonical,
      fhirVersion: [fhirVersion]
    });
    // infer name and id using canonical
    Object.assign(config.config, ConfigurationExtractor.inferNameAndId(config));
    // infer status and version from most common values
    const status = ConfigurationExtractor.inferString(
      resources,
      'status'
    ) as ImplementationGuideStatus;
    if (status) {
      config.config.status = status;
    }
    const version = ConfigurationExtractor.inferString(resources, 'version');
    if (version) {
      config.config.version = version;
    }
    return config;
  }

  static inferCanonical(resources: Package): string {
    // url may be present as a CaretValueRule, path = '', caret path = 'url'
    const potentialCanonicals: string[] = [];
    [
      ...resources.profiles,
      ...resources.extensions,
      ...resources.valueSets,
      ...resources.codeSystems
    ].forEach(resource => {
      const urlRule = (resource.rules as ExportableRule[]).find(rule => {
        return (
          rule instanceof ExportableCaretValueRule && rule.path === '' && rule.caretPath === 'url'
        );
      }) as ExportableCaretValueRule;
      if (urlRule) {
        potentialCanonicals.push(
          urlRule.value
            .toString()
            .replace(/\/(StructureDefinition|ValueSet|CodeSystem)\/[^/]+$/, '')
        );
      }
    });

    return ConfigurationExtractor.getStringMode(potentialCanonicals);
  }

  // The regular expression for matching the canonical won't behave perfectly in all cases,
  // due to the sheer variety of possible valid URLs. But, it tries its best.
  static inferNameAndId(config: ExportableConfiguration): { name?: string; id?: string } {
    const canonicalMatch = config.config.canonical.match(/^https?:\/\/([\w.]+)(\/.*)?$/);
    if (canonicalMatch) {
      const hostParts = canonicalMatch[1].split('.').slice(0, -1);
      const pathParts = canonicalMatch[2]?.split('/') ?? [];
      const idParts = [
        ...filter(hostParts, part => part.length > 2 && part !== 'www'),
        ...filter(pathParts, part => part.length > 0)
      ];
      return {
        name: idParts.map(capitalize).join(''),
        id: idParts.join('.')
      };
    } else {
      return {};
    }
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
        if (caretRule.value instanceof FshCode) {
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
      // Example results after each function
      //   potentials: ['foo', 'bar', 'baz', 'foo', 'bar', 'bar']
      //   countBy:    { 'foo': 2, 'bar': 3, 'baz': 1 }
      //   toPairs:    [ ['foo', 2], ['bar': 3], ['baz': 1] ]
      //   maxBy:      ['bar', 3]
      //   maxyBy[0]:  'bar'
      return maxBy(toPairs(countBy(potentials)), pair => pair[1])[0];
    } else {
      return '';
    }
  }
}
