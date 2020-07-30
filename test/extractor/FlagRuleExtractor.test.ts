import path from 'path';
import fs from 'fs-extra';
import { ElementDefinition } from 'fsh-sushi/dist/fhirtypes';
import { FlagRuleExtractor } from '../../src/rule-extractor';
import { ExportableFlagRule } from '../../src/exportable';

describe('FlagRuleExtractor', () => {
  let extractor: FlagRuleExtractor;
  let looseSD: any;

  beforeAll(() => {
    extractor = new FlagRuleExtractor();
    looseSD = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'flag-profile.json'), 'utf-8').trim()
    );
  });

  it('should extract a flag rule with mustSupport', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[0]);
    const flagRule = extractor.process(element);
    const expectedRule = new ExportableFlagRule('status');
    expectedRule.mustSupport = true;
    expect(flagRule).toEqual<ExportableFlagRule>(expectedRule);
  });

  it('should extract a flag rule with isSummary', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[1]);
    const flagRule = extractor.process(element);
    const expectedRule = new ExportableFlagRule('category');
    expectedRule.summary = true;
    expect(flagRule).toEqual<ExportableFlagRule>(expectedRule);
  });

  it('should extract a flag rule with isModifier', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[2]);
    const flagRule = extractor.process(element);
    const expectedRule = new ExportableFlagRule('code');
    expectedRule.modifier = true;
    expect(flagRule).toEqual<ExportableFlagRule>(expectedRule);
  });

  it('should extract a flag rule with mustSupport and isSummary', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[8]);
    const flagRule = extractor.process(element);
    const expectedRule = new ExportableFlagRule('note');
    expectedRule.mustSupport = true;
    expectedRule.summary = true;
    expect(flagRule).toEqual<ExportableFlagRule>(expectedRule);
  });

  it('should extract a flag rule with normative status', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[3]);
    const flagRule = extractor.process(element);
    const expectedRule = new ExportableFlagRule('focus');
    expectedRule.normative = true;
    expect(flagRule).toEqual<ExportableFlagRule>(expectedRule);
  });

  it('should extract a flag rule with trial-use status', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[4]);
    const flagRule = extractor.process(element);
    const expectedRule = new ExportableFlagRule('encounter');
    expectedRule.trialUse = true;
    expect(flagRule).toEqual<ExportableFlagRule>(expectedRule);
  });

  it('should extract a flag rule with draft status', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[5]);
    const flagRule = extractor.process(element);
    const expectedRule = new ExportableFlagRule('issued');
    expectedRule.draft = true;
    expect(flagRule).toEqual<ExportableFlagRule>(expectedRule);
  });

  it('should default to the first status flag when multiple status extensions are present', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[6]);
    const flagRule = extractor.process(element);
    const expectedRule = new ExportableFlagRule('performer');
    expectedRule.normative = true;
    expect(flagRule).toEqual<ExportableFlagRule>(expectedRule);
  });

  it('should return a null when the element has no flag information', () => {
    const element = ElementDefinition.fromJSON(looseSD.differential.element[7]);
    const flagRule = extractor.process(element);
    expect(flagRule).toBeNull();
  });
});
