import { fshtypes } from 'fsh-sushi';
import { ExportableConfiguration } from '../exportable';
import { logger } from 'fsh-sushi/dist/utils';

export class ConfigurationProcessor {
  static process(input: any): ExportableConfiguration {
    // canonical and fhirVersion are the minimal required properties for configuration
    // canonical is inferred from the url property
    const missingProperties: string[] = [];
    if (!input.url) {
      missingProperties.push('url');
    }
    if (!input.fhirVersion?.length) {
      missingProperties.push('fhirVersion');
    }
    if (missingProperties.length > 0) {
      logger.warn(
        `ImplementationGuide missing properties needed to generate configuration file: ${missingProperties.join(
          ', '
        )}`
      );
      return;
    }
    const config: fshtypes.Configuration = {
      canonical: input.url?.replace(/\/ImplementationGuide.*/, ''),
      fhirVersion: input.fhirVersion
    };
    if (input.id) {
      config.id = input.id;
    }
    return new ExportableConfiguration(config);
  }
}
