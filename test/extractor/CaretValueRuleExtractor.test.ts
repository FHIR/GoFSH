import path from 'path';
import fs from 'fs-extra';
import { cloneDeep } from 'lodash';
import { fhirdefs, fshtypes } from 'fsh-sushi';
import { CaretValueRuleExtractor } from '../../src/rule-extractor';
import { ExportableCaretValueRule } from '../../src/exportable';
import { ProcessableElementDefinition } from '../../src/processor';
import { loggerSpy } from '../helpers/loggerSpy';

describe('CaretValueRuleExtractor', () => {
  let looseSD: any;
  let defs: fhirdefs.FHIRDefinitions;

  beforeAll(() => {
    defs = new fhirdefs.FHIRDefinitions();
    fhirdefs.loadFromPath(path.join(__dirname, '..', 'utils', 'testdefs'), 'testPackage', defs);
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'caret-value-profile.json'), 'utf-8').trim()
    );
  });

  describe('StructureDefinition', () => {
    it('should not extract any SD caret rules when only keyword-based properties have changed', () => {
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(looseSD, defs);
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([]);
    });

    it('should extract a single top-level caret value rule', () => {
      const sd = cloneDeep(looseSD);
      sd.version = '1.2.3';
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs);
      const expectedRule = new ExportableCaretValueRule('');
      expectedRule.caretPath = 'version';
      expectedRule.value = '1.2.3';
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule]);
    });

    it('should extract multiple top-level caret value rule', () => {
      const sd = cloneDeep(looseSD);
      sd.version = '1.2.3';
      sd.experimental = true;
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs);
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'version';
      expectedRule1.value = '1.2.3';
      const expectedRule2 = new ExportableCaretValueRule('');
      expectedRule2.caretPath = 'experimental';
      expectedRule2.value = true;
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule1, expectedRule2]);
    });

    // NOTE: StructureDefinition doesn't have any non-array complex types at the top-level,
    // so there isn't an opportunity to test for nest paths except within arrays (tested below)

    it('should extract array caret value rules', () => {
      const sd = cloneDeep(looseSD);
      sd.contextInvariant = ['foo-1', 'foo-2'];
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs);
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'contextInvariant[0]';
      expectedRule1.value = 'foo-1';
      const expectedRule2 = new ExportableCaretValueRule('');
      expectedRule2.caretPath = 'contextInvariant[1]';
      expectedRule2.value = 'foo-2';
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule1, expectedRule2]);
    });

    it('should extract array caret value rules with children', () => {
      const sd = cloneDeep(looseSD);
      sd.identifier = [
        {
          system: 'http://foo.org/ids',
          value: 'bar'
        },
        {
          system: 'http://bar.org/ids',
          value: 'baz'
        }
      ];
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs);
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'identifier[0].system';
      expectedRule1.value = 'http://foo.org/ids';
      const expectedRule2 = new ExportableCaretValueRule('');
      expectedRule2.caretPath = 'identifier[0].value';
      expectedRule2.value = 'bar';
      const expectedRule3 = new ExportableCaretValueRule('');
      expectedRule3.caretPath = 'identifier[1].system';
      expectedRule3.value = 'http://bar.org/ids';
      const expectedRule4 = new ExportableCaretValueRule('');
      expectedRule4.caretPath = 'identifier[1].value';
      expectedRule4.value = 'baz';
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([
        expectedRule1,
        expectedRule2,
        expectedRule3,
        expectedRule4
      ]);
    });

    it('should convert a FHIR code string to a FSH code when extracting', () => {
      const sd = cloneDeep(looseSD);
      sd.status = 'draft';
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs);
      const expectedRule = new ExportableCaretValueRule('');
      expectedRule.caretPath = 'status';
      expectedRule.value = new fshtypes.FshCode('draft');
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule]);
    });

    it('should not extract caret rules when an array is exactly the same as the inherited array', () => {
      const sd = cloneDeep(looseSD);
      sd.mapping = [
        {
          identity: 'workflow',
          uri: 'http://hl7.org/fhir/workflow',
          name: 'Workflow Pattern'
        },
        {
          identity: 'sct-concept',
          uri: 'http://snomed.info/conceptdomain',
          name: 'SNOMED CT Concept Domain Binding'
        },
        {
          identity: 'v2',
          uri: 'http://hl7.org/v2',
          name: 'HL7 v2 Mapping'
        },
        {
          identity: 'rim',
          uri: 'http://hl7.org/v3',
          name: 'RIM Mapping'
        },
        {
          identity: 'w5',
          uri: 'http://hl7.org/fhir/fivews',
          name: 'FiveWs Pattern Mapping'
        },
        {
          identity: 'sct-attr',
          uri: 'http://snomed.org/attributebinding',
          name: 'SNOMED CT Attribute Binding'
        }
      ];
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs);
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([]);
    });

    it('should not extract caret rules when an array is a subset of the inherited array', () => {
      // NOTE: This is due to a limitation in FSH; you cannot replace arrays or delete array items
      const sd = cloneDeep(looseSD);
      sd.mapping = [
        {
          identity: 'sct-concept',
          uri: 'http://snomed.info/conceptdomain',
          name: 'SNOMED CT Concept Domain Binding'
        },
        {
          identity: 'w5',
          uri: 'http://hl7.org/fhir/fivews',
          name: 'FiveWs Pattern Mapping'
        }
      ];
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs);
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([]);
    });

    it('should extract caret rules for added elements in inherited non-extension array', () => {
      const sd = cloneDeep(looseSD);
      sd.mapping = [
        {
          identity: 'workflow',
          uri: 'http://hl7.org/fhir/workflow',
          name: 'Workflow Pattern'
        },
        {
          identity: 'sct-concept',
          uri: 'http://snomed.info/conceptdomain',
          name: 'SNOMED CT Concept Domain Binding'
        },
        {
          identity: 'v2',
          uri: 'http://hl7.org/v2',
          name: 'HL7 v2 Mapping'
        },
        {
          identity: 'rim',
          uri: 'http://hl7.org/v3',
          name: 'RIM Mapping'
        },
        {
          identity: 'w5',
          uri: 'http://hl7.org/fhir/fivews',
          name: 'FiveWs Pattern Mapping'
        },
        {
          identity: 'sct-attr',
          uri: 'http://snomed.org/attributebinding',
          name: 'SNOMED CT Attribute Binding'
        },
        {
          identity: 'foo-mapping',
          uri: 'http://foo.org/mapping',
          name: 'Foo Mapping'
        }
      ];
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs);
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'mapping[6].identity';
      expectedRule1.value = 'foo-mapping';
      const expectedRule2 = new ExportableCaretValueRule('');
      expectedRule2.caretPath = 'mapping[6].uri';
      expectedRule2.value = 'http://foo.org/mapping';
      const expectedRule3 = new ExportableCaretValueRule('');
      expectedRule3.caretPath = 'mapping[6].name';
      expectedRule3.value = 'Foo Mapping';
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([
        expectedRule1,
        expectedRule2,
        expectedRule3
      ]);
    });

    it('should extract caret rules for modified elements in inherited non-extension array', () => {
      const sd = cloneDeep(looseSD);
      sd.mapping = [
        {
          identity: 'workflow',
          uri: 'http://hl7.org/fhir/workflow',
          name: 'Workflow Pattern'
        },
        {
          identity: 'sct-concept',
          uri: 'http://snomed.info/conceptdomain',
          name: 'SNOMED CT Concept Domain Binding'
        },
        {
          identity: 'v2',
          uri: 'http://hl7.org/v2',
          name: 'HL7 v2 Mapping'
        },
        {
          identity: 'rim',
          uri: 'http://hl7.org/v3',
          name: 'RIM Mapping!'
        },
        {
          identity: 'w5',
          uri: 'http://hl7.org/fhir/fivews',
          name: 'FiveWs Pattern Mapping'
        },
        {
          identity: 'sct-attr',
          uri: 'http://snomed.org/attributebinding',
          name: 'SNOMED CT Attribute Binding'
        }
      ];
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs);
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'mapping[3].name';
      expectedRule1.value = 'RIM Mapping!';
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule1]);
    });

    it('should extract caret rules for all elements in appended inherited extension array', () => {
      const sd = cloneDeep(looseSD);
      sd.extension = [
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-category',
          valueString: 'Clinical.Diagnostics'
        },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
          valueCode: 'normative'
        },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-normative-version',
          valueCode: '4.0.0'
        },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm',
          valueInteger: 5
        },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-security-category',
          valueCode: 'patient'
        },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-wg',
          valueCode: 'oo'
        },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/foo-ext',
          valueCode: 'bar'
        }
      ];
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs);
      const expectedRules: ExportableCaretValueRule[] = [];
      let n = -1;
      // extension[0]
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].url`;
      expectedRules[n].value =
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-category';
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].valueString`;
      expectedRules[n].value = 'Clinical.Diagnostics';
      // extension[1]
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].url`;
      expectedRules[n].value =
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status';
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].valueCode`;
      expectedRules[n].value = new fshtypes.FshCode('normative');
      // extension[2]
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].url`;
      expectedRules[n].value =
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-normative-version';
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].valueCode`;
      expectedRules[n].value = new fshtypes.FshCode('4.0.0');
      // extension[3]
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].url`;
      expectedRules[n].value = 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm';
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].valueInteger`;
      expectedRules[n].value = 5;
      // extension[4]
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].url`;
      expectedRules[n].value =
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-security-category';
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].valueCode`;
      expectedRules[n].value = new fshtypes.FshCode('patient');
      // extension[5]
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].url`;
      expectedRules[n].value = 'http://hl7.org/fhir/StructureDefinition/structuredefinition-wg';
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].valueCode`;
      expectedRules[n].value = new fshtypes.FshCode('oo');
      // extension[6]
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].url`;
      expectedRules[n].value = 'http://hl7.org/fhir/StructureDefinition/foo-ext';
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].valueCode`;
      expectedRules[n].value = new fshtypes.FshCode('bar');

      expect(caretRules).toEqual<ExportableCaretValueRule[]>(expectedRules);
    });

    it('should extract caret rules for all elements in modified inherited extension array', () => {
      const sd = cloneDeep(looseSD);
      sd.extension = [
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-category',
          valueString: 'Clinical.Diagnostics'
        },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status',
          valueCode: 'trial-use'
        },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-normative-version',
          valueCode: '4.0.0'
        },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm',
          valueInteger: 5
        },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-security-category',
          valueCode: 'patient'
        },
        {
          url: 'http://hl7.org/fhir/StructureDefinition/structuredefinition-wg',
          valueCode: 'oo'
        }
      ];
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs);
      const expectedRules: ExportableCaretValueRule[] = [];
      let n = -1;
      // extension[0]
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].url`;
      expectedRules[n].value =
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-category';
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].valueString`;
      expectedRules[n].value = 'Clinical.Diagnostics';
      // extension[1]
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].url`;
      expectedRules[n].value =
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-standards-status';
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].valueCode`;
      expectedRules[n].value = new fshtypes.FshCode('trial-use');
      // extension[2]
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].url`;
      expectedRules[n].value =
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-normative-version';
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].valueCode`;
      expectedRules[n].value = new fshtypes.FshCode('4.0.0');
      // extension[3]
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].url`;
      expectedRules[n].value = 'http://hl7.org/fhir/StructureDefinition/structuredefinition-fmm';
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].valueInteger`;
      expectedRules[n].value = 5;
      // extension[4]
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].url`;
      expectedRules[n].value =
        'http://hl7.org/fhir/StructureDefinition/structuredefinition-security-category';
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].valueCode`;
      expectedRules[n].value = new fshtypes.FshCode('patient');
      // extension[5]
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].url`;
      expectedRules[n].value = 'http://hl7.org/fhir/StructureDefinition/structuredefinition-wg';
      expectedRules[++n] = new ExportableCaretValueRule('');
      expectedRules[n].caretPath = `extension[${Math.floor(n / 2)}].valueCode`;
      expectedRules[n].value = new fshtypes.FshCode('oo');

      expect(caretRules).toEqual<ExportableCaretValueRule[]>(expectedRules);
    });

    it('should not export a caret rule for generated text', () => {
      const sd = cloneDeep(looseSD);
      sd.text = {
        status: 'generated',
        div: '<div>Foo!</div'
      };
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs);
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([]);
    });

    it('should export a caret rule for "cleared" properties, even if it is the same as the parent', () => {
      const sd = cloneDeep(looseSD);
      sd.publisher = 'Health Level Seven International (Orders and Observations)';
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs);
      const expectedRule = new ExportableCaretValueRule('');
      expectedRule.caretPath = 'publisher';
      expectedRule.value = 'Health Level Seven International (Orders and Observations)';
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule]);
    });

    it('should log an error if the parent is unresolvable, but still export caret rules for "cleared" properties', () => {
      const sd = cloneDeep(looseSD);
      sd.baseDefinition = 'http://i.dont.exist.org/';
      sd.publisher = 'Acme, Inc.';
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Cannot reliably export .* ObservationWithCaret .* http:\/\/i\.dont\.exist\.org\//
      );
      const expectedRule = new ExportableCaretValueRule('');
      expectedRule.caretPath = 'publisher';
      expectedRule.value = 'Acme, Inc.';
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule]);
    });
  });

  describe('Elements', () => {
    it('should extract a single top-level caret value rule', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
      const caretRules = CaretValueRuleExtractor.process(element, defs);
      const expectedRule = new ExportableCaretValueRule('identifier');
      expectedRule.caretPath = 'short';
      expectedRule.value = 'foo';
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule]);
    });

    it('should extract multiple top-level caret value rules', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
      const caretRules = CaretValueRuleExtractor.process(element, defs);
      const expectedRule1 = new ExportableCaretValueRule('basedOn');
      expectedRule1.caretPath = 'short';
      expectedRule1.value = 'foo';
      const expectedRule2 = new ExportableCaretValueRule('basedOn');
      expectedRule2.caretPath = 'definition';
      expectedRule2.value = 'bar';
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule1, expectedRule2]);
    });

    it('should extract a single nested path caret value rule', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
      const caretRules = CaretValueRuleExtractor.process(element, defs);
      const expectedRule = new ExportableCaretValueRule('partOf');
      expectedRule.caretPath = 'base.path';
      expectedRule.value = 'foo';
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule]);
    });

    it('should extract multiple nested path caret value rules', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]);
      const caretRules = CaretValueRuleExtractor.process(element, defs);
      const expectedRule1 = new ExportableCaretValueRule('status');
      expectedRule1.caretPath = 'base.path';
      expectedRule1.value = 'foo';
      const expectedRule2 = new ExportableCaretValueRule('status');
      expectedRule2.caretPath = 'base.min';
      expectedRule2.value = 0;
      const expectedRule3 = new ExportableCaretValueRule('status');
      expectedRule3.caretPath = 'slicing.discriminator.type';
      expectedRule3.value = new fshtypes.FshCode('value');
      expect(caretRules).toHaveLength(3);
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule1);
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule2);
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule3);
    });

    it('should extract array caret value rules', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[4]);
      const caretRules = CaretValueRuleExtractor.process(element, defs);
      const expectedRule1 = new ExportableCaretValueRule('category');
      expectedRule1.caretPath = 'alias[0]';
      expectedRule1.value = 'foo';
      const expectedRule2 = new ExportableCaretValueRule('category');
      expectedRule2.caretPath = 'alias[1]';
      expectedRule2.value = 'bar';
      expect(caretRules).toHaveLength(2);
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule1);
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule2);
    });

    it('should extract array caret value rules with children', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[5]);
      const caretRules = CaretValueRuleExtractor.process(element, defs);
      const expectedRule1 = new ExportableCaretValueRule('code');
      expectedRule1.caretPath = 'code[0].system';
      expectedRule1.value = 'http://foo.com';
      const expectedRule2 = new ExportableCaretValueRule('code');
      expectedRule2.caretPath = 'code[1].version';
      expectedRule2.value = '1.2.3';
      expect(caretRules).toHaveLength(2);
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule1);
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule2);
    });

    it('should convert a FHIR code string to a FSH code when extracting', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[8]);
      const caretRules = CaretValueRuleExtractor.process(element, defs);
      const expectedRule = new ExportableCaretValueRule('dataAbsentReason.coding.code');
      expectedRule.caretPath = 'fixedCode';
      expectedRule.value = new fshtypes.FshCode('foo');
      expect(caretRules).toHaveLength(1);
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule);
    });

    it('should return no rules when the element only has id and path', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[6]);
      const caretRules = CaretValueRuleExtractor.process(element, defs);
      expect(caretRules).toEqual([]);
    });

    it('should ignore previously processed paths', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[7]);
      element.processedPaths = [
        'min',
        'type[0].code',
        'type[1].code',
        'type[1].targetProfile[0]',
        'type[1].targetProfile[1]'
      ];

      const caretRules = CaretValueRuleExtractor.process(element, defs);
      const expectedRule1 = new ExportableCaretValueRule('focus');
      expectedRule1.caretPath = 'short';
      expectedRule1.value = 'foo';
      const expectedRule2 = new ExportableCaretValueRule('focus');
      expectedRule2.caretPath = 'type[1].versioning';
      expectedRule2.value = new fshtypes.FshCode('specific');
      expect(caretRules).toHaveLength(2);
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule1);
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule2);
    });
  });
});
