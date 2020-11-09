import path from 'path';
import fs from 'fs-extra';
import { InstanceProcessor } from '../../src/processor';
import { ExportableInstance } from '../../src/exportable';

describe('InstanceProcessor', () => {
  let simpleIg: any;

  beforeEach(() => {
    simpleIg = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-ig.json'), 'utf-8')
    );
  });

  it('should convert the simplest example Instance', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-patient.json'), 'utf-8')
    );
    const result = InstanceProcessor.process(input, simpleIg);
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('simple-patient');
    expect(result.instanceOf).toBe('Patient');
    expect(result.usage).toBe('Example');
  });

  it('should convert an example Instance with a meta.profile', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'profiled-patient.json'), 'utf-8')
    );
    const result = InstanceProcessor.process(input, simpleIg);
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('profiled-patient');
    expect(result.instanceOf).toBe('http://example.org/StructureDefinition/profiled-patient');
    expect(result.usage).toBe('Example');
  });

  it('should convert the simplest vocabulary Instance', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-valueset-with-id.json'), 'utf-8')
    );
    const result = InstanceProcessor.process(input, simpleIg);
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('my.value-set');
    expect(result.instanceOf).toBe('ValueSet');
    expect(result.usage).toBe('Definition');
  });

  it('should convert an example Instance with additional metadata from an IG', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-valueset-with-id.json'), 'utf-8')
    );
    simpleIg.definition = {
      resource: [
        {
          reference: { reference: 'ValueSet/my.value-set' },
          name: 'My Title',
          description: 'My Description',
          exampleBoolean: true
        }
      ]
    };
    const result = InstanceProcessor.process(input, simpleIg);
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('my.value-set');
    expect(result.instanceOf).toBe('ValueSet');
    expect(result.usage).toBe('Example');
    expect(result.title).toBe('My Title');
    expect(result.description).toBe('My Description');
  });

  it('should convert a non-example Instance with additional metadata from an IG', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'nameless-valueset-with-id.json'), 'utf-8')
    );
    simpleIg.definition = {
      resource: [
        {
          reference: { reference: 'ValueSet/my.value-set' },
          name: 'My Title',
          description: 'My Description'
        }
      ]
    };
    const result = InstanceProcessor.process(input, simpleIg);
    expect(result).toBeInstanceOf(ExportableInstance);
    expect(result.name).toBe('my.value-set');
    expect(result.instanceOf).toBe('ValueSet');
    expect(result.usage).toBe('Definition');
    expect(result.title).toBe('My Title');
    expect(result.description).toBe('My Description');
  });
});
