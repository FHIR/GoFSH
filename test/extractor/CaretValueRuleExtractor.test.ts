import path from 'path';
import fs from 'fs-extra';
import { cloneDeep } from 'lodash';
import { fhirdefs, fshtypes } from 'fsh-sushi';
import { CaretValueRuleExtractor } from '../../src/extractor';
import { ExportableCaretValueRule } from '../../src/exportable';
import { ProcessableElementDefinition } from '../../src/processor';
import { loggerSpy } from '../helpers/loggerSpy';
import { loadTestDefinitions } from '../helpers/loadTestDefinitions';

describe('CaretValueRuleExtractor', () => {
  let looseSD: any;
  let looseVS: any;
  let looseCS: any;
  let looseBSSD: any;
  let config: fshtypes.Configuration;
  let defs: fhirdefs.FHIRDefinitions;

  beforeAll(() => {
    defs = loadTestDefinitions();
    config = {
      canonical: 'http://hl7.org/fhir/sushi-test',
      fhirVersion: ['4.0.1']
    };
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'caret-value-profile.json'), 'utf-8').trim()
    );
    looseVS = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'caret-value-valueSet.json'), 'utf-8').trim()
    );
    looseCS = JSON.parse(
      fs
        .readFileSync(path.join(__dirname, 'fixtures', 'caret-value-codeSystem.json'), 'utf-8')
        .trim()
    );
    looseBSSD = JSON.parse(
      fs
        .readFileSync(path.join(__dirname, 'fixtures', 'caret-value-profile-draft.json'), 'utf-8')
        .trim()
    );
  });

  describe('StructureDefinition', () => {
    it('should not extract any SD caret rules when only keyword-based properties have changed', () => {
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(looseSD, defs, config);
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([]);
    });

    it('should extract a url-setting caret rules when a non-standard url is included on a StructureDefinition', () => {
      const urlSD = cloneDeep(looseSD);
      urlSD.url = 'http://diferenturl.com';
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(urlSD, defs, config);
      expect(caretRules).toHaveLength(1);
      expect(caretRules[0].caretPath).toEqual('url');
      expect(caretRules[0].value).toEqual('http://diferenturl.com');
    });

    it('should extract a single top-level caret value rule', () => {
      const sd = cloneDeep(looseSD);
      sd.version = '1.2.3';
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
      const expectedRule = new ExportableCaretValueRule('');
      expectedRule.caretPath = 'version';
      expectedRule.value = '1.2.3';
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule]);
    });

    it('should always extract a caret value rule for status when it is not "active"', () => {
      const sd = cloneDeep(looseBSSD);
      sd.status = 'draft';
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
      const expectedRule = new ExportableCaretValueRule('');
      expectedRule.caretPath = 'status';
      expectedRule.value = new fshtypes.FshCode('draft');
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule]);
    });

    it('should extract multiple top-level caret value rule', () => {
      const sd = cloneDeep(looseSD);
      sd.version = '1.2.3';
      sd.experimental = true;
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
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
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
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
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
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
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
      const expectedRule = new ExportableCaretValueRule('');
      expectedRule.caretPath = 'status';
      expectedRule.value = new fshtypes.FshCode('draft');
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule]);
    });

    it('should not extract caret rules when an array is exactly the same as the inherited array', () => {
      const sd = cloneDeep(looseSD);
      sd.context = [
        {
          type: 'element',
          expression: 'Foo'
        },
        {
          type: 'element',
          expression: 'Bar'
        },
        {
          type: 'element',
          expression: 'Baz'
        }
      ];
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([]);
    });

    it('should not extract caret rules when an array is a subset of the inherited array', () => {
      // NOTE: This is due to a limitation in FSH; you cannot replace arrays or delete array items
      const sd = cloneDeep(looseSD);
      sd.context = [
        {
          type: 'element',
          expression: 'Foo'
        },
        {
          type: 'element',
          expression: 'Baz'
        }
      ];
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([]);
    });

    it('should extract caret rules for added elements in inherited non-extension array', () => {
      const sd = cloneDeep(looseSD);
      sd.context = [
        {
          type: 'element',
          expression: 'Foo'
        },
        {
          type: 'element',
          expression: 'Bar'
        },
        {
          type: 'element',
          expression: 'Baz'
        },
        {
          type: 'element',
          expression: 'SomethingFancyAndNew'
        }
      ];
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'context[3].type';
      expectedRule1.value = new fshtypes.FshCode('element');
      const expectedRule2 = new ExportableCaretValueRule('');
      expectedRule2.caretPath = 'context[3].expression';
      expectedRule2.value = 'SomethingFancyAndNew';
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule1, expectedRule2]);
    });

    it('should extract caret rules for modified elements in inherited non-extension array', () => {
      const sd = cloneDeep(looseSD);
      sd.context = [
        {
          type: 'element',
          expression: 'Foo'
        },
        {
          type: 'fhirpath',
          expression: 'Bar'
        },
        {
          type: 'element',
          expression: 'Baz'
        }
      ];
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'context[1].type';
      expectedRule1.value = new fshtypes.FshCode('fhirpath');
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
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
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
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
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
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([]);
    });

    it('should export a caret rule for "cleared" properties, even if it is the same as the parent', () => {
      const sd = cloneDeep(looseSD);
      sd.publisher = 'Health Level Seven International (Orders and Observations)';
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
      const expectedRule = new ExportableCaretValueRule('');
      expectedRule.caretPath = 'publisher';
      expectedRule.value = 'Health Level Seven International (Orders and Observations)';
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule]);
    });

    it('should log an error if the parent is unresolvable, but still export caret rules for "cleared" properties', () => {
      const sd = cloneDeep(looseSD);
      sd.baseDefinition = 'http://i.dont.exist.org/';
      sd.publisher = 'Acme, Inc.';
      const caretRules = CaretValueRuleExtractor.processStructureDefinition(sd, defs, config);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Cannot reliably export .* ObservationWithCaret .* http:\/\/i\.dont\.exist\.org\//
      );
      const expectedRule = new ExportableCaretValueRule('');
      expectedRule.caretPath = 'publisher';
      expectedRule.value = 'Acme, Inc.';
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([expectedRule]);
    });
  });

  describe('ValueSet', () => {
    it('should not extract any ValueSet caret rules when only keyword-based properties have changed', () => {
      const caretRules = CaretValueRuleExtractor.processResource(
        looseVS,
        defs,
        looseVS.resourceType,
        config
      );
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([]);
    });

    it('should extract a url-setting caret rule when a non-standard url is included on a ValueSet', () => {
      const urlVS = cloneDeep(looseVS);
      urlVS.url = 'http://diferenturl.com';
      const caretRules = CaretValueRuleExtractor.processResource(
        urlVS,
        defs,
        urlVS.resourceType,
        config
      );
      expect(caretRules).toHaveLength(1);
      expect(caretRules[0].caretPath).toEqual('url');
      expect(caretRules[0].value).toEqual('http://diferenturl.com');
    });

    it('should extract ValueSet caret rules when non keyword-based properties have changed', () => {
      const vs = cloneDeep(looseVS);
      vs.status = 'active';
      vs.compose.inactive = true;
      vs.identifier = { value: 'foo' };
      const caretRules = CaretValueRuleExtractor.processResource(vs, defs, vs.resourceType, config);
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'status';
      expectedRule1.value = new fshtypes.FshCode('active');
      const expectedRule2 = new ExportableCaretValueRule('');
      expectedRule2.caretPath = 'compose.inactive';
      expectedRule2.value = true;
      const expectedRule3 = new ExportableCaretValueRule('');
      expectedRule3.caretPath = 'identifier.value';
      expectedRule3.value = 'foo';
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule1);
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule2);
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule3);
      expect(caretRules).toHaveLength(3);
    });
  });

  describe('CodeSystem', () => {
    it('should not extract any CodeSystem caret rules when only keyword-based properties have changed', () => {
      const caretRules = CaretValueRuleExtractor.processResource(
        looseCS,
        defs,
        looseCS.resourceType,
        config
      );
      expect(caretRules).toEqual<ExportableCaretValueRule[]>([]);
    });

    it('should extract a url-setting caret rule when a non-standard url is included on a CodeSystem', () => {
      const urlCS = cloneDeep(looseCS);
      urlCS.url = 'http://diferenturl.com';
      const caretRules = CaretValueRuleExtractor.processResource(
        urlCS,
        defs,
        urlCS.resourceType,
        config
      );
      expect(caretRules).toHaveLength(1);
      expect(caretRules[0].caretPath).toEqual('url');
      expect(caretRules[0].value).toEqual('http://diferenturl.com');
    });

    it('should extract CodeSystem caret rules when non keyword-based properties have changed', () => {
      const cs = cloneDeep(looseCS);
      cs.status = 'active';
      cs.experimental = true;
      cs.identifier = { value: 'foo' };
      const caretRules = CaretValueRuleExtractor.processResource(cs, defs, cs.resourceType, config);
      const expectedRule1 = new ExportableCaretValueRule('');
      expectedRule1.caretPath = 'status';
      expectedRule1.value = new fshtypes.FshCode('active');
      const expectedRule2 = new ExportableCaretValueRule('');
      expectedRule2.caretPath = 'experimental';
      expectedRule2.value = true;
      const expectedRule3 = new ExportableCaretValueRule('');
      expectedRule3.caretPath = 'identifier.value';
      expectedRule3.value = 'foo';
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule1);
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule2);
      expect(caretRules).toContainEqual<ExportableCaretValueRule>(expectedRule3);
      expect(caretRules).toHaveLength(3);
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
