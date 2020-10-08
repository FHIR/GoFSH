import path from 'path';
import fs from 'fs-extra';
import { CardRuleExtractor } from '../../src/extractor';
import { ExportableCardRule } from '../../src/exportable';
import { ProcessableElementDefinition } from '../../src/processor';
import { fhirdefs } from 'fsh-sushi';
import { cloneDeep } from 'lodash';

describe('CardRuleExtractor', () => {
  let looseSD: any;
  let looseSDWithSlices: any;
  let looseSDWithInheritedSlices: any;
  let defs: fhirdefs.FHIRDefinitions;

  beforeAll(() => {
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'card-profile.json'), 'utf-8').trim()
    );
    looseSDWithSlices = JSON.parse(
      fs
        .readFileSync(path.join(__dirname, 'fixtures', 'card-profile-with-slices.json'), 'utf-8')
        .trim()
    );
    looseSDWithInheritedSlices = JSON.parse(
      fs
        .readFileSync(
          path.join(__dirname, 'fixtures', 'card-profile-with-inherited-slices.json'),
          'utf-8'
        )
        .trim()
    );
    defs = new fhirdefs.FHIRDefinitions();
    fhirdefs.loadFromPath(path.join(__dirname, '..', 'utils', 'testdefs'), 'testPackage', defs);
  });
  describe('#process', () => {
    it('should extract a card rule with a min and a max', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[0]);
      const cardRule = CardRuleExtractor.process(element, looseSD, defs);
      const expectedRule = new ExportableCardRule('note');
      expectedRule.min = 1;
      expectedRule.max = '7';
      expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
      expect(element.processedPaths).toEqual(['min', 'max']);
    });

    it('should extract a card rule with only a min', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[2]);
      const cardRule = CardRuleExtractor.process(element, looseSD, defs);
      const expectedRule = new ExportableCardRule('component');
      expectedRule.min = 3;
      expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
      expect(element.processedPaths).toEqual(['min']);
    });

    it('should extract a card rule with only a max', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[3]);
      const cardRule = CardRuleExtractor.process(element, looseSD, defs);
      const expectedRule = new ExportableCardRule('category');
      expectedRule.max = '8';
      expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
      expect(element.processedPaths).toEqual(['max']);
    });

    it('should return a null when the element has no cardinality information', () => {
      const element = ProcessableElementDefinition.fromJSON(looseSD.differential.element[1]);
      const cardRule = CardRuleExtractor.process(element, looseSD, defs);
      expect(cardRule).toBeNull();
      expect(element.processedPaths).toEqual([]);
    });

    it('should return a null when there is only a min, and there are card-constrained slices, and min matches the sum of mins of all the slices', () => {
      const element = ProcessableElementDefinition.fromJSON(
        looseSDWithSlices.differential.element[0]
      );
      const cardRule = CardRuleExtractor.process(element, looseSDWithSlices, defs);
      expect(cardRule).toBeNull();
      expect(element.processedPaths).toEqual(['min']);
    });

    it('should return a card rule with min when the min does not match the sum of mins of the slices', () => {
      // Modify the fixture so the min doesn't equal the sum of the slices' mins
      const clonedSD = cloneDeep(looseSDWithSlices);
      clonedSD.differential.element[0].min = 4;
      const element = ProcessableElementDefinition.fromJSON(clonedSD.differential.element[0]);
      const cardRule = CardRuleExtractor.process(element, clonedSD, defs);
      const expectedRule = new ExportableCardRule('component');
      expectedRule.min = 4;
      expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
      expect(element.processedPaths).toEqual(['min']);
    });

    it('should return a null when there is only a min, and there are card-constrained slices, and min matches the sum of mins of the all the slices (and the slicing is only in snapshot)', () => {
      // Modify the fixture so the slicing is only in the snapshot (representing the case where it is inherited)
      const clonedSD = cloneDeep(looseSDWithSlices);
      delete clonedSD.differential.element[0].slicing;
      const element = ProcessableElementDefinition.fromJSON(clonedSD.differential.element[0]);
      const cardRule = CardRuleExtractor.process(element, clonedSD, defs);
      expect(cardRule).toBeNull();
      expect(element.processedPaths).toEqual(['min']);
    });

    it('should return a card rule with min even if it matches the sum of mins of the slices when there are no card-constrained slices in the differential', () => {
      // Modify the fixture so the slicing and slices are only in the snapshot (representing the case where they are inherited)
      const clonedSD = cloneDeep(looseSDWithSlices);
      delete clonedSD.differential.element[0].slicing;
      delete clonedSD.differential.element[1].min;
      delete clonedSD.differential.element[1].max;
      delete clonedSD.differential.element[2];
      const element = ProcessableElementDefinition.fromJSON(clonedSD.differential.element[0]);
      const cardRule = CardRuleExtractor.process(element, clonedSD, defs);
      const expectedRule = new ExportableCardRule('component');
      expectedRule.min = 3;
      expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
      expect(element.processedPaths).toEqual(['min']);
    });

    it('should return a card rule with min even if it matches the sum of mins of the slices when there are no slices in the differential', () => {
      // Modify the fixture so the slicing and slices are only in the snapshot (representing the case where they are inherited)
      const clonedSD = cloneDeep(looseSDWithSlices);
      delete clonedSD.differential.element[0].slicing;
      delete clonedSD.differential.element[1];
      delete clonedSD.differential.element[2];
      const element = ProcessableElementDefinition.fromJSON(clonedSD.differential.element[0]);
      const cardRule = CardRuleExtractor.process(element, clonedSD, defs);
      const expectedRule = new ExportableCardRule('component');
      expectedRule.min = 3;
      expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
      expect(element.processedPaths).toEqual(['min']);
    });

    it('should return a card rule with min when the min does not match the sum of mins of the slices', () => {
      // Modify the fixture so the min doesn't equal the sum of the slices' mins and so one slice is only in snapshot
      const clonedSD = cloneDeep(looseSDWithSlices);
      clonedSD.differential.element[0].min = 1; // technically invalid, but want to make it match differential mins (as added test case)
      delete clonedSD.differential.element[1];
      const element = ProcessableElementDefinition.fromJSON(clonedSD.differential.element[0]);
      const cardRule = CardRuleExtractor.process(element, clonedSD, defs);
      const expectedRule = new ExportableCardRule('component');
      expectedRule.min = 1;
      expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
      expect(element.processedPaths).toEqual(['min']);
    });

    it('should return a null when there is only a min, and there are card-constrained slices, and min matches the sum of mins of all slices (w/ no snapshot)', () => {
      // Modify the fixture so the slicing is only in the snapshot (representing the case where it is inherited)
      const element = ProcessableElementDefinition.fromJSON(
        looseSDWithInheritedSlices.differential.element[0]
      );
      const cardRule = CardRuleExtractor.process(element, looseSDWithInheritedSlices, defs);
      expect(cardRule).toBeNull();
      expect(element.processedPaths).toEqual(['min']);
    });

    it('should return a card rule with min when the min does not match the sum of mins of the inherited slices w/ no snapshots', () => {
      // Modify the fixture so the min doesn't equal the sum of the slices' mins and so one slice is only in snapshot
      const clonedSD = cloneDeep(looseSDWithInheritedSlices);
      clonedSD.differential.element[0].min = 1; // technically invalid, but want to make it match differential mins (as added test case)
      const element = ProcessableElementDefinition.fromJSON(clonedSD.differential.element[0]);
      const cardRule = CardRuleExtractor.process(element, clonedSD, defs);
      const expectedRule = new ExportableCardRule('component');
      expectedRule.min = 1;
      expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
      expect(element.processedPaths).toEqual(['min']);
    });

    it('should return a card with only max when the min matches the sum of mins of the slices', () => {
      // Modify the fixture so the sliced element (component) has max of 5
      const clonedSD = cloneDeep(looseSDWithSlices);
      clonedSD.snapshot.element[0].max = '5';
      clonedSD.differential.element[0].max = '5';
      // Process it
      const element = ProcessableElementDefinition.fromJSON(clonedSD.differential.element[0]);
      const cardRule = CardRuleExtractor.process(element, clonedSD, defs);
      const expectedRule = new ExportableCardRule('component');
      expectedRule.max = '5';
      expect(cardRule).toEqual<ExportableCardRule>(expectedRule);
      expect(element.processedPaths).toEqual(['min', 'max']);
    });
  });
});
