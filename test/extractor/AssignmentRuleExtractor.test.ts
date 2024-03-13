import path from 'path';
import fs from 'fs-extra';
import { fhirtypes, fshtypes } from 'fsh-sushi';
import { AssignmentRuleExtractor } from '../../src/extractor';
import { ExportableAssignmentRule } from '../../src/exportable';
import { ProcessableElementDefinition } from '../../src/processor';
import { loggerSpy } from '../helpers/loggerSpy';

describe('AssignmentRuleExtractor', () => {
  beforeEach(() => {
    loggerSpy.reset();
  });

  describe('#simple-values', () => {
    let looseSD: any;

    beforeAll(() => {
      looseSD = JSON.parse(
        fs
          .readFileSync(path.join(__dirname, 'fixtures', 'assigned-value-profile.json'), 'utf-8')
          .trim()
      );
    });

    it('should extract an assigned value rule with a fixed number value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('valueInteger');
      expectedRule.value = 0;
      expectedRule.exactly = true;
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('fixedInteger');
    });

    it('should extract an assigned value rule with a pattern number value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('component.valueInteger');
      expectedRule.value = 8;
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('patternInteger');
    });

    it('should extract an assigned value rule with a fixed string value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('effectiveInstant');
      expectedRule.value = '2020-07-24T9:31:23.745-04:00';
      expectedRule.exactly = true;
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('fixedInstant');
    });

    it('should extract an assigned value rule with a pattern string value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('note.text');
      expectedRule.value = 'This is the "note" text.\nThere are two lines.';
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('patternString');
    });

    it('should extract an assigned value rule with a fixed boolean value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[4]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('valueBoolean');
      expectedRule.value = true;
      expectedRule.exactly = true;
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('fixedBoolean');
    });

    it('should extract an assigned value rule with a pattern boolean value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[5]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('component.valueBoolean');
      expectedRule.value = false;
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('patternBoolean');
    });

    it('should extract an assigned value rule with a fixed integer64 value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[8]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('valueInteger64');
      expectedRule.value = BigInt('9223372036854775807');
      expectedRule.exactly = true;
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('fixedInteger64');
    });

    it('should extract an assigned value rule with a pattern integer64 value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[9]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('valueInteger64');
      expectedRule.value = BigInt('9223372036854775807');
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('patternInteger64');
    });

    it('should extract an assigned value rule with a pattern code', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[6]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('status');
      expectedRule.value = new fshtypes.FshCode('final');
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('patternCode');
    });

    it('should return no rules when an element does not have a fixed or pattern value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[7]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      expect(assignmentRules).toHaveLength(0);
      expect(element.processedPaths).toHaveLength(0);
    });
  });

  describe('#simple-date-and-time-values', () => {
    let looseSD: any;

    beforeAll(() => {
      looseSD = JSON.parse(
        fs
          .readFileSync(
            path.join(__dirname, 'fixtures', 'temporal-assigned-value-profile.json'),
            'utf-8'
          )
          .trim()
      );
    });

    it('should extract an assigned value rule with an instant value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('effectiveInstant');
      expectedRule.value = '2020-07-24T09:31:23.745-04:00';
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('patternInstant');
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should extract an assigned value with a dateTime value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('valueDateTime');
      expectedRule.value = '2013-01-01T00:00:00.000Z';
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('patternDateTime');
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should extract an assigned value with a time value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('valueTime');
      expectedRule.value = '15:45:00';
      expectedRule.exactly = true;
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('fixedTime');
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should extract an assigned value with a date value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('extension.valueDate');
      expectedRule.value = '2023-09-21';
      expectedRule.exactly = true;
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('fixedDate');
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });
  });

  describe('#simple-date-and-time-warnings', () => {
    let looseSD: any;

    beforeAll(() => {
      looseSD = JSON.parse(
        fs
          .readFileSync(
            path.join(__dirname, 'fixtures', 'temporal-warning-value-profile.json'),
            'utf-8'
          )
          .trim()
      );
    });

    it('should extract an assigned value rule with an incorrectly formatted instant value and log a warning', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('effectiveInstant');
      expectedRule.value = '2020-07-24 9:31:23.745-04:00';
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('patternInstant');
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Value 2020-07-24 9:31:23\.745-04:00 on element effectiveInstant is not a valid FHIR instant/s
      );
    });

    it('should extract an assigned value with an incorrectly formatted dateTime value and log a warning', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('valueDateTime');
      expectedRule.value = '2013-01-01 00:00:00.000';
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('patternDateTime');
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Value 2013-01-01 00:00:00\.000 on element valueDateTime is not a valid FHIR dateTime/s
      );
    });

    it('should extract an assigned value with an incorrectly formatted time value and log a warning', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('valueTime');
      expectedRule.value = '15:45';
      expectedRule.exactly = true;
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('fixedTime');
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Value 15:45 on element valueTime is not a valid FHIR time/s
      );
    });

    it('should extract an assigned value with an incorrectly formatted date value and log a warning', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('extension.valueDate');
      expectedRule.value = '2023/09/21';
      expectedRule.exactly = true;
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toContain('fixedDate');
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /Value 2023\/09\/21 on element extension\.valueDate is not a valid FHIR date/s
      );
    });
  });

  describe('#complex-values', () => {
    let looseSD: any;

    beforeAll(() => {
      looseSD = JSON.parse(
        fs
          .readFileSync(
            path.join(__dirname, 'fixtures', 'complex-assigned-value-profile.json'),
            'utf-8'
          )
          .trim()
      );
    });

    it('should extract an assigned value rule with a fixed Coding value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[5]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('dataAbsentReason.coding');
      expectedRule.value = new fshtypes.FshCode('DNE', 'http://example.com/codes');
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toHaveLength(3);
      expect(element.processedPaths).toContain('patternCoding.code');
      expect(element.processedPaths).toContain('patternCoding.system');
      expect(element.processedPaths).toContain('patternCoding.display');
    });

    it('should extract an assigned value rule with a fixed CodeableConcept value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('code');
      expectedRule.value = new fshtypes.FshCode(
        '12343',
        'http://example.com/codes',
        'something\\nhere'
      );
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toHaveLength(3);
      expect(element.processedPaths).toContain('patternCodeableConcept.coding[0].code');
      expect(element.processedPaths).toContain('patternCodeableConcept.coding[0].system');
      expect(element.processedPaths).toContain('patternCodeableConcept.coding[0].display');
    });

    it('should extract an assigned value rule with a fixed Quantity value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('valueQuantity');
      expectedRule.value = new fshtypes.FshQuantity(
        1.21,
        new fshtypes.FshCode('GW', 'http://unitsofmeasure.org')
      );
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toHaveLength(4);
      expect(element.processedPaths).toContain('patternQuantity.value');
      expect(element.processedPaths).toContain('patternQuantity.code');
      expect(element.processedPaths).toContain('patternQuantity.system');
      expect(element.processedPaths).toContain('patternQuantity.unit');
    });

    it('should extract an assigned value rule with a fixed Quantity value that does not have quantity.value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
      delete element.patternQuantity.value;
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('valueQuantity');
      expectedRule.value = new fshtypes.FshCode('GW', 'http://unitsofmeasure.org');
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toHaveLength(4);
      expect(element.processedPaths).toContain('patternQuantity.value');
      expect(element.processedPaths).toContain('patternQuantity.code');
      expect(element.processedPaths).toContain('patternQuantity.system');
      expect(element.processedPaths).toContain('patternQuantity.unit');
    });

    it('should extract an assigned value rule with a fixed Ratio value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('valueRatio');
      expectedRule.value = new fshtypes.FshRatio(
        new fshtypes.FshQuantity(5, new fshtypes.FshCode('cm', 'http://other-units.org')),
        new fshtypes.FshQuantity(1, new fshtypes.FshCode('s', 'http://different-units.org'))
      );
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toHaveLength(8);
      expect(element.processedPaths).toContain('patternRatio.numerator.value');
      expect(element.processedPaths).toContain('patternRatio.numerator.code');
      expect(element.processedPaths).toContain('patternRatio.numerator.system');
      expect(element.processedPaths).toContain('patternRatio.numerator.unit');
      expect(element.processedPaths).toContain('patternRatio.denominator.value');
      expect(element.processedPaths).toContain('patternRatio.denominator.code');
      expect(element.processedPaths).toContain('patternRatio.denominator.system');
      expect(element.processedPaths).toContain('patternRatio.denominator.unit');
    });

    it('should extract assigned value rules when the numerator quantity does not contain a value property', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
      delete element.patternRatio.numerator.value;
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedNumeratorRule = new ExportableAssignmentRule('valueRatio.numerator');
      expectedNumeratorRule.value = new fshtypes.FshCode('cm', 'http://other-units.org');
      const expectedDenominatorRule = new ExportableAssignmentRule('valueRatio.denominator');
      expectedDenominatorRule.value = new fshtypes.FshQuantity(
        1,
        new fshtypes.FshCode('s', 'http://different-units.org')
      );
      expect(assignmentRules).toHaveLength(2);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedNumeratorRule);
      expect(assignmentRules[1]).toEqual<ExportableAssignmentRule>(expectedDenominatorRule);
      expect(element.processedPaths).toContain('patternRatio.numerator.value');
      expect(element.processedPaths).toContain('patternRatio.numerator.code');
      expect(element.processedPaths).toContain('patternRatio.numerator.system');
      expect(element.processedPaths).toContain('patternRatio.numerator.unit');
      expect(element.processedPaths).toContain('patternRatio.denominator.value');
      expect(element.processedPaths).toContain('patternRatio.denominator.code');
      expect(element.processedPaths).toContain('patternRatio.denominator.system');
      expect(element.processedPaths).toContain('patternRatio.denominator.unit');
    });

    it('should extract assigned value rules when the denominator quantity does not contain a value property', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
      delete element.patternRatio.denominator.value;
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedNumeratorRule = new ExportableAssignmentRule('valueRatio.numerator');
      expectedNumeratorRule.value = new fshtypes.FshQuantity(
        5,
        new fshtypes.FshCode('cm', 'http://other-units.org')
      );
      const expectedDenominatorRule = new ExportableAssignmentRule('valueRatio.denominator');
      expectedDenominatorRule.value = new fshtypes.FshCode('s', 'http://different-units.org');
      expect(assignmentRules).toHaveLength(2);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedNumeratorRule);
      expect(assignmentRules[1]).toEqual<ExportableAssignmentRule>(expectedDenominatorRule);
      expect(element.processedPaths).toContain('patternRatio.numerator.value');
      expect(element.processedPaths).toContain('patternRatio.numerator.code');
      expect(element.processedPaths).toContain('patternRatio.numerator.system');
      expect(element.processedPaths).toContain('patternRatio.numerator.unit');
      expect(element.processedPaths).toContain('patternRatio.denominator.value');
      expect(element.processedPaths).toContain('patternRatio.denominator.code');
      expect(element.processedPaths).toContain('patternRatio.denominator.system');
      expect(element.processedPaths).toContain('patternRatio.denominator.unit');
    });

    it('should extract an assigned value rule with a fixed Reference value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('subject');
      expectedRule.value = new fshtypes.FshReference(
        'http://example.com/PaulBunyan',
        'Paul Bunyan\\t(real)'
      );
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toHaveLength(2);
      expect(element.processedPaths).toContain('patternReference.reference');
      expect(element.processedPaths).toContain('patternReference.display');
    });

    it.skip('should extract an assigned value rule with a fixed Instance value', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[4]);
      const assignmentRules = AssignmentRuleExtractor.process(element);
      const expectedRule = new ExportableAssignmentRule('note');
      const expectedValue = new fhirtypes.InstanceDefinition();
      expectedValue.resourceType = 'Annotation';
      expectedValue.text = 'We were out in the woods that day.';
      expectedRule.value = expectedValue;
      expectedRule.isInstance = true;
      expect(assignmentRules).toHaveLength(1);
      expect(assignmentRules[0]).toEqual<ExportableAssignmentRule>(expectedRule);
      expect(element.processedPaths).toHaveLength(1);
      expect(element.processedPaths).toContain('patternAnnotation.text');
    });
  });
});
