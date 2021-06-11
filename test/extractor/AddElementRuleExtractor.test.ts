import path from 'path';
import fs from 'fs-extra';
import { ProcessableElementDefinition } from '../../src/processor';
import { AddElementRuleExtractor } from '../../src/extractor';
import { ExportableAddElementRule } from '../../src/exportable';

describe('AddElementRuleExtractor', () => {
  let looseSD: any;

  beforeAll(() => {
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'add-element-resource.json'), 'utf-8').trim()
    );
  });

  describe('#process', () => {
    it('should extract an add element rule with a cardinality and one type', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
      const elementRule = AddElementRuleExtractor.process(element);
      const expectedRule = new ExportableAddElementRule('bread');
      expectedRule.min = 1;
      expectedRule.max = '1';
      expectedRule.short = 'Always get bread';
      expectedRule.types.push({ type: 'CodeableConcept' });
      expect(elementRule).toEqual<ExportableAddElementRule>(expectedRule);
      expect(element.processedPaths).toEqual(
        expect.arrayContaining(['min', 'max', 'short', 'type[0].code'])
      );
    });

    it('should extract an add element rule with multiple types', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
      const elementRule = AddElementRuleExtractor.process(element);
      const expectedRule = new ExportableAddElementRule('apple[x]');
      expectedRule.min = 0;
      expectedRule.max = '3';
      expectedRule.short = 'Get some apples';
      expectedRule.types.push({ type: 'string' }, { type: 'CodeableConcept' });
      expect(elementRule).toEqual<ExportableAddElementRule>(expectedRule);
      expect(element.processedPaths).toEqual(
        expect.arrayContaining(['min', 'max', 'short', 'type[0].code', 'type[1].code'])
      );
    });

    it('should extract an add element rule with a reference type', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]);
      const elementRule = AddElementRuleExtractor.process(element);
      const expectedRule = new ExportableAddElementRule('orange');
      expectedRule.min = 0;
      expectedRule.max = '1';
      expectedRule.short = 'Get an orange';
      expectedRule.types.push({
        type: 'http://hl7.org/fhir/StructureDefinition/Substance',
        isReference: true
      });
      expect(elementRule).toEqual<ExportableAddElementRule>(expectedRule);
      expect(element.processedPaths).toEqual(
        expect.arrayContaining(['min', 'max', 'short', 'type[0].code', 'type[0].targetProfile[0]'])
      );
    });

    it('should extract an add element rule with a profiled type', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[4]);
      const elementRule = AddElementRuleExtractor.process(element);
      const expectedRule = new ExportableAddElementRule('banana');
      expectedRule.min = 1;
      expectedRule.max = '*';
      expectedRule.short = 'Lots of bananas';
      expectedRule.types.push({
        type: 'http://hl7.org/fhir/StructureDefinition/SimpleQuantity'
      });
      expect(elementRule).toEqual<ExportableAddElementRule>(expectedRule);
      expect(element.processedPaths).toEqual(
        expect.arrayContaining(['min', 'max', 'short', 'type[0].code', 'type[0].profile[0]'])
      );
    });

    it('should extract an add element rule with the must support flag', () => {
      // SUSHI does not allow this flag on AddElementRule, but that's something for SUSHI to complain about.
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[5]);
      const elementRule = AddElementRuleExtractor.process(element);
      const expectedRule = new ExportableAddElementRule('potato');
      expectedRule.min = 1;
      expectedRule.max = '3';
      expectedRule.short = 'Potato must be supported';
      expectedRule.types.push({
        type: 'CodeableConcept'
      });
      expectedRule.mustSupport = true;
      expect(elementRule).toEqual<ExportableAddElementRule>(expectedRule);
      expect(element.processedPaths).toEqual(
        expect.arrayContaining(['min', 'max', 'short', 'type[0].code', 'mustSupport'])
      );
    });

    it('should extract an add element rule with the summary flag', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[6]);
      const elementRule = AddElementRuleExtractor.process(element);
      const expectedRule = new ExportableAddElementRule('peppers');
      expectedRule.min = 0;
      expectedRule.max = '*';
      expectedRule.short = 'Sweet peppers';
      expectedRule.types.push({
        type: 'CodeableConcept'
      });
      expectedRule.summary = true;
      expect(elementRule).toEqual<ExportableAddElementRule>(expectedRule);
      expect(element.processedPaths).toEqual(
        expect.arrayContaining(['min', 'max', 'short', 'type[0].code', 'isSummary'])
      );
    });

    it('should extract an add element rule with the modifier flag', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[7]);
      const elementRule = AddElementRuleExtractor.process(element);
      const expectedRule = new ExportableAddElementRule('onions');
      expectedRule.min = 0;
      expectedRule.max = '3';
      expectedRule.short = 'Onions can change flavors a lot';
      expectedRule.types.push({
        type: 'CodeableConcept'
      });
      expectedRule.modifier = true;
      expect(elementRule).toEqual<ExportableAddElementRule>(expectedRule);
      expect(element.processedPaths).toEqual(
        expect.arrayContaining(['min', 'max', 'short', 'type[0].code', 'isModifier'])
      );
    });

    it('should extract an add element rule with the draft flag', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[8]);
      const elementRule = AddElementRuleExtractor.process(element);
      const expectedRule = new ExportableAddElementRule('cabbage');
      expectedRule.min = 0;
      expectedRule.max = '1';
      expectedRule.short = 'Cabbages... but just one';
      expectedRule.types.push({
        type: 'CodeableConcept'
      });
      expectedRule.draft = true;
      expect(elementRule).toEqual<ExportableAddElementRule>(expectedRule);
      expect(element.processedPaths).toEqual(
        expect.arrayContaining([
          'min',
          'max',
          'short',
          'type[0].code',
          'extension[0].url',
          'extension[0].valueCode'
        ])
      );
    });

    it('should extract an add element rule with the trial use flag', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[9]);
      const elementRule = AddElementRuleExtractor.process(element);
      const expectedRule = new ExportableAddElementRule('milk');
      expectedRule.min = 0;
      expectedRule.max = '1';
      expectedRule.short = 'Any kind of milk you want';
      expectedRule.types.push({
        type: 'Quantity'
      });
      expectedRule.trialUse = true;
      expect(elementRule).toEqual<ExportableAddElementRule>(expectedRule);
      expect(element.processedPaths).toEqual(
        expect.arrayContaining([
          'min',
          'max',
          'short',
          'type[0].code',
          'extension[0].url',
          'extension[0].valueCode'
        ])
      );
    });

    it('should extract an add element rule with the normative flag', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[10]);
      const elementRule = AddElementRuleExtractor.process(element);
      const expectedRule = new ExportableAddElementRule('coffee');
      expectedRule.min = 0;
      expectedRule.max = '2';
      expectedRule.short = 'Coffee is good in the morning';
      expectedRule.types.push({
        type: 'Quantity'
      });
      expectedRule.normative = true;
      expect(elementRule).toEqual<ExportableAddElementRule>(expectedRule);
      expect(element.processedPaths).toEqual(
        expect.arrayContaining([
          'min',
          'max',
          'short',
          'type[0].code',
          'extension[0].url',
          'extension[0].valueCode'
        ])
      );
    });

    it('should extract an add element rule with multiple flags', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[11]);
      const elementRule = AddElementRuleExtractor.process(element);
      const expectedRule = new ExportableAddElementRule('peanuts');
      expectedRule.min = 0;
      expectedRule.max = '*';
      expectedRule.short = 'Peanuts are a good snack';
      expectedRule.types.push({
        type: 'CodeableConcept'
      });
      expectedRule.normative = true;
      expectedRule.summary = true;
      expect(elementRule).toEqual<ExportableAddElementRule>(expectedRule);
      expect(element.processedPaths).toEqual(
        expect.arrayContaining([
          'min',
          'max',
          'short',
          'type[0].code',
          'isSummary',
          'extension[0].url',
          'extension[0].valueCode'
        ])
      );
    });

    it('should extract an add element rule with definition text', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[12]);
      const elementRule = AddElementRuleExtractor.process(element);
      const expectedRule = new ExportableAddElementRule('spice');
      expectedRule.min = 0;
      expectedRule.max = '*';
      expectedRule.short = 'Assorted spices';
      expectedRule.definition = 'Any kind of spice is allowed';
      expectedRule.types.push({ type: 'CodeableConcept' });
      expect(elementRule).toEqual<ExportableAddElementRule>(expectedRule);
      expect(element.processedPaths).toEqual(
        expect.arrayContaining(['min', 'max', 'short', 'definition', 'type[0].code'])
      );
    });

    it('should extract an add element rule with multiple types, flags, and definition text', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[13]);
      const elementRule = AddElementRuleExtractor.process(element);
      const expectedRule = new ExportableAddElementRule('cookies');
      expectedRule.min = 0;
      expectedRule.max = '2';
      expectedRule.short = 'Cookies are delicious';
      expectedRule.definition = 'Cookies are the most important thing to get at the grocery store.';
      expectedRule.types.push({ type: 'string' });
      expectedRule.normative = true;
      expectedRule.summary = true;
      expect(elementRule).toEqual<ExportableAddElementRule>(expectedRule);
      expect(element.processedPaths).toEqual(
        expect.arrayContaining([
          'min',
          'max',
          'short',
          'definition',
          'isSummary',
          'type[0].code',
          'extension[0].url',
          'extension[0].valueCode'
        ])
      );
    });
  });
});
