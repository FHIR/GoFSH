import { countBy, toPairs, maxBy, capitalize, filter } from 'lodash';
import { fhirtypes } from 'fsh-sushi';
import { ExportableConfiguration } from '../exportable';

type ImplementationGuideStatus = fhirtypes.ImplementationGuideStatus;

export class ConfigurationExtractor {
  static process(resources: any[]): ExportableConfiguration {
    // canonical and fhirVersion are required elements in configuration, so they get defaults
    const canonical = ConfigurationExtractor.inferCanonical(resources) || 'http://sample.org';
    const fhirVersion = ConfigurationExtractor.inferString(resources, 'fhirVersion') || '4.0.1';
    const config = new ExportableConfiguration({
      canonical: canonical,
      fhirVersion: [fhirVersion],
      FSHOnly: true,
      applyExtensionMetadataToRoot: false
    });
    // infer name and id using canonical
    Object.assign(config.config, ConfigurationExtractor.inferNameAndId(canonical));
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

  static inferCanonical(resources: any[]): string {
    const potentialCanonicals: string[] = [];
    resources.forEach(resource => {
      if (resource.url) {
        potentialCanonicals.push(
          resource.url.toString().replace(/\/(StructureDefinition|ValueSet|CodeSystem)\/[^/]+$/, '')
        );
      }
    });
    return ConfigurationExtractor.getStringMode(potentialCanonicals);
  }

  static inferString(resources: any[], path: string): string {
    const potentialStrings: string[] = [];
    resources.forEach(resource => {
      if (resource[path]) {
        potentialStrings.push(resource[path].toString());
      }
    });
    return ConfigurationExtractor.getStringMode(potentialStrings);
  }

  // The regular expression for matching the canonical won't behave perfectly in all cases,
  // due to the sheer variety of possible valid URLs. But, it tries its best.
  static inferNameAndId(canonical: string): { name?: string; id?: string } {
    const canonicalMatch = canonical.match(/^https?:\/\/([\w.]+)(\/.*)?$/);
    if (canonicalMatch) {
      const hostParts = canonicalMatch[1].split('.').slice(0, -1);
      const pathParts = canonicalMatch[2]?.split('/').filter(part => part.length > 0) ?? [];
      const idParts = [
        ...filter(hostParts, part => part.length > 2 && part !== 'www'),
        ...filter(pathParts, part => part.length > 0)
      ];
      // Many IGs are hosted at a URL that starts with http://hl7.org/fhir/
      // However, they generally do not include "hl7" and "fhir" at the start of their name.
      // So, if the first two idParts are "hl7" and "fhir" don't use them in the name.
      const id = idParts.join('.');
      const name = (idParts?.[0] === 'hl7' && idParts?.[1] === 'fhir' ? idParts.slice(2) : idParts)
        .map(capitalize)
        .join('');
      return { name, id };
    } else {
      return {};
    }
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
