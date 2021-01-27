import path from 'path';
import fs from 'fs-extra';
import { ConfigurationProcessor } from '../../src/processor/ConfigurationProcessor';
import { ExportableConfiguration } from '../../src/exportable';
import { loggerSpy } from '../helpers/loggerSpy';
import { ImplementationGuideDependsOn } from 'fsh-sushi/dist/fhirtypes';

describe('ConfigurationProcessor', () => {
  it('should create a Configuration from an ImplementationGuide with url and fhirVersion properties', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-ig.json'), 'utf-8')
    );
    const result = ConfigurationProcessor.process(input);
    expect(result).toBeInstanceOf(ExportableConfiguration);
    expect(result.config.canonical).toBe('http://example.org/tests');
    expect(result.config.fhirVersion).toEqual(['4.0.1']);
    expect(result.config.FSHOnly).toBe(true);
    expect(result.config.applyExtensionMetadataToRoot).toBe(false);
  });

  it('should not create a Configuration without a url', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'missing-url-ig.json'), 'utf-8')
    );
    const result = ConfigurationProcessor.process(input);
    expect(result).toBeUndefined();
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /ImplementationGuide missing properties.*url/s
    );
  });

  it('should not create a Configuration without a fhirVersion', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'missing-fhir-version-ig.json'), 'utf-8')
    );
    const result = ConfigurationProcessor.process(input);
    expect(result).toBeUndefined();
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /ImplementationGuide missing properties.*fhirVersion/s
    );
  });

  it('should create a Configuration with additional properties', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'bigger-ig.json'), 'utf-8')
    );

    const testDependencies: ImplementationGuideDependsOn[] = [
      {
        version: '3.1.0',
        packageId: 'hl7.fhir.us.core',
        uri: 'http://hl7.org/fhir/us/core/ImplementationGuide/hl7.fhir.us.core'
      },
      {
        version: '1.0.0',
        packageId: 'hl7.fhir.us.mcode',
        uri: 'http://hl7.org/fhir/us/mcode/ImplementationGuide/hl7.fhir.us.mcode'
      }
    ];

    const result = ConfigurationProcessor.process(input);
    expect(result).toBeInstanceOf(ExportableConfiguration);
    expect(result.config.canonical).toBe('http://example.org/tests');
    expect(result.config.fhirVersion).toEqual(['4.0.1']);
    expect(result.config.id).toBe('bigger.ig');
    expect(result.config.name).toBe('BiggerImplementationGuideForTesting');
    expect(result.config.status).toBe('active');
    expect(result.config.version).toBe('0.12');
    expect(result.config.dependencies).toEqual(testDependencies);
  });
});
