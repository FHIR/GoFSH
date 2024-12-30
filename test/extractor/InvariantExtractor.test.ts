import path from 'path';
import fs from 'fs-extra';
import { ProcessableElementDefinition, ProcessableStructureDefinition } from '../../src/processor';
import { InvariantExtractor } from '../../src/extractor';
import { ExportableAssignmentRule, ExportableInvariant } from '../../src/exportable';
import { fshtypes } from 'fsh-sushi';
import { FHIRDefinitions } from '../../src/utils';
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';
import { loggerSpy } from '../helpers/loggerSpy';
const { FshCode } = fshtypes;

describe('InvariantExtractor', () => {
  let defs: FHIRDefinitions;
  let looseSD: ProcessableStructureDefinition;

  beforeAll(async () => {
    defs = await loadTestDefinitions();
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'obeys-profile.json'), 'utf-8').trim()
    );
  });

  beforeEach(() => {
    loggerSpy.reset();
  });

  it('should extract invariants from an element with one constraint', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
    const invariants = InvariantExtractor.process(element, looseSD, [], defs);
    const rootInvariant = new ExportableInvariant('zig-1');
    rootInvariant.severity = new FshCode('warning');
    rootInvariant.description = 'This is a constraint on the root element.';

    expect(invariants).toHaveLength(1);
    expect(invariants).toContainEqual(rootInvariant);
    expect(element.processedPaths).toContain('constraint[0].key');
    expect(element.processedPaths).toContain('constraint[0].severity');
    expect(element.processedPaths).toContain('constraint[0].human');
    expect(element.processedPaths).toContain('constraint[0].source');
  });

  it('should extract invariants from an element with multiple constraints', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
    const invariants = InvariantExtractor.process(element, looseSD, [], defs);
    const expressionInvariant = new ExportableInvariant('zig-2');
    expressionInvariant.severity = new FshCode('error');
    expressionInvariant.description = 'This constraint has an expression.';
    expressionInvariant.expression = 'category.exists()';
    const xpathInvariant = new ExportableInvariant('zig-3');
    xpathInvariant.severity = new FshCode('warning');
    xpathInvariant.description = 'This constraint has an xpath.';
    xpathInvariant.xpath = 'f:category';
    const bothInvariant = new ExportableInvariant('zig-4');
    bothInvariant.severity = new FshCode('warning');
    bothInvariant.description = 'This constraint has an expression and an xpath.';
    bothInvariant.expression = 'category.double.exists()';
    bothInvariant.xpath = 'f:category/double';
    const complexInvariant = new ExportableInvariant('zig-5');
    complexInvariant.severity = new FshCode('warning');
    complexInvariant.description = 'This constraint has some extra rules.';
    complexInvariant.expression = 'category.triple.exists()';
    const invExtensionUrl = new ExportableAssignmentRule('human.extension[0].url');
    invExtensionUrl.value = 'http://example.org/SomeExtension';
    const invExtensionValue = new ExportableAssignmentRule('human.extension[0].valueString');
    invExtensionValue.value = 'ExtensionValue';
    const invRequirements = new ExportableAssignmentRule('requirements');
    invRequirements.value = 'This is an additional requirement';
    complexInvariant.rules.push(invExtensionUrl, invExtensionValue, invRequirements);

    expect(invariants).toHaveLength(4);
    expect(invariants).toContainEqual(expressionInvariant);
    expect(invariants).toContainEqual(xpathInvariant);
    expect(invariants).toContainEqual(bothInvariant);
    expect(invariants).toContainEqual(complexInvariant);
    expect(element.processedPaths).toContain('constraint[0].key');
    expect(element.processedPaths).toContain('constraint[0].severity');
    expect(element.processedPaths).toContain('constraint[0].human');
    expect(element.processedPaths).toContain('constraint[0].expression');
    expect(element.processedPaths).toContain('constraint[0].source');
    expect(element.processedPaths).toContain('constraint[1].key');
    expect(element.processedPaths).toContain('constraint[1].severity');
    expect(element.processedPaths).toContain('constraint[1].human');
    expect(element.processedPaths).toContain('constraint[1].xpath');
    expect(element.processedPaths).toContain('constraint[1].source');
    expect(element.processedPaths).toContain('constraint[2].key');
    expect(element.processedPaths).toContain('constraint[2].severity');
    expect(element.processedPaths).toContain('constraint[2].human');
    expect(element.processedPaths).toContain('constraint[2].expression');
    expect(element.processedPaths).toContain('constraint[2].xpath');
    expect(element.processedPaths).toContain('constraint[2].source');
    expect(element.processedPaths).toContain('constraint[3].key');
    expect(element.processedPaths).toContain('constraint[3].severity');
    expect(element.processedPaths).toContain('constraint[3].human');
    expect(element.processedPaths).toContain('constraint[3].human.extension[0].url');
    expect(element.processedPaths).toContain('constraint[3].human.extension[0].valueString');
    expect(element.processedPaths).toContain('constraint[3].expression');
    expect(element.processedPaths).toContain('constraint[3].requirements');
  });

  it('should extract no invariants from an element with no constraints', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
    const invariants = InvariantExtractor.process(element, looseSD, [], defs);
    expect(invariants).toHaveLength(0);
    expect(element.processedPaths).toHaveLength(0);
  });

  it('should emit a warning when a rule value on an invariant is an incorrectly formatted date', () => {
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]);
    const invariants = InvariantExtractor.process(element, looseSD, [], defs);
    const subjectInvariant = new ExportableInvariant('zig-6');
    subjectInvariant.severity = new FshCode('warning');
    subjectInvariant.description = 'This constraint has an incorrectly formatted date value.';
    subjectInvariant.expression = 'subject.date.exists()';
    const invExtensionUrl = new ExportableAssignmentRule('human.extension[0].url');
    invExtensionUrl.value = 'http://example.org/SomeExtension';
    const invExtensionValue = new ExportableAssignmentRule('human.extension[0].valueDate');
    invExtensionValue.value = '2023/09/21';
    subjectInvariant.rules.push(invExtensionUrl, invExtensionValue);

    expect(invariants).toHaveLength(1);
    expect(invariants).toContainEqual(subjectInvariant);
    expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
    expect(loggerSpy.getLastMessage('warn')).toMatch(
      /Value 2023\/09\/21 on ConstrainedObservation\.subject element constraint\[0\]\.human\.extension\[0\]\.valueDate is not a valid FHIR date/s
    );
  });

  it('should not extract an invariant and should process paths if an equal invariant already exists', () => {
    const existingInvariant = new ExportableInvariant('zig-1');
    existingInvariant.severity = new FshCode('warning');
    existingInvariant.description = 'This is a constraint on the root element.';
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
    const invariants = InvariantExtractor.process(element, looseSD, [existingInvariant], defs);
    expect(invariants).toHaveLength(0);
    expect(element.processedPaths).toHaveLength(4);
    expect(element.processedPaths).toContainEqual('constraint[0].key');
    expect(element.processedPaths).toContainEqual('constraint[0].severity');
    expect(element.processedPaths).toContainEqual('constraint[0].human');
    expect(element.processedPaths).toContainEqual('constraint[0].source');
  });

  it('should not extract an invariant nor process paths if a non-equal invariant with a matching key already exists', () => {
    const existingInvariant = new ExportableInvariant('zig-1');
    const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
    const invariants = InvariantExtractor.process(element, looseSD, [existingInvariant], defs);
    expect(invariants).toHaveLength(0);
    expect(element.processedPaths).toHaveLength(0);
  });
});
