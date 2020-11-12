import { fshtypes } from 'fsh-sushi';
import { ValueSetConceptComponentRuleExtractor } from '../../src/extractor';

const { FshCode } = fshtypes;

describe('ValueSetComponentRuleExtractor', () => {
  it('should extract a ValueSetConceptComponentRule from a component with a system and at least one concept', () => {
    const input = {
      system: 'http://example.org/zoo',
      concept: [
        {
          code: 'BEAR'
        },
        {
          code: 'LION',
          display: 'Lion'
        }
      ]
    };
    const result = ValueSetConceptComponentRuleExtractor.process(input, true);

    expect(result.inclusion).toBe(true);
    expect(result.from).toEqual({
      system: 'http://example.org/zoo'
    });
    expect(result.concepts).toHaveLength(2);
    expect(result.concepts).toContainEqual(new FshCode('BEAR', 'http://example.org/zoo'));
    expect(result.concepts).toContainEqual(new FshCode('LION', 'http://example.org/zoo', 'Lion'));
  });

  it('should extract a ValueSetConceptComponentRule from a component with a system, at least one value set, and at least one concept', () => {
    const input = {
      system: 'http://example.org/zoo',
      valueSet: ['http://example.org/mammals', 'http://example.org/vertebrates'],
      concept: [
        {
          code: 'BEAR'
        },
        {
          code: 'LION',
          display: 'Lion'
        }
      ]
    };
    const result = ValueSetConceptComponentRuleExtractor.process(input, false);

    expect(result.inclusion).toBe(false);
    expect(result.from).toEqual({
      system: 'http://example.org/zoo',
      valueSets: ['http://example.org/mammals', 'http://example.org/vertebrates']
    });
    expect(result.concepts).toHaveLength(2);
    expect(result.concepts).toContainEqual(new FshCode('BEAR', 'http://example.org/zoo'));
    expect(result.concepts).toContainEqual(new FshCode('LION', 'http://example.org/zoo', 'Lion'));
  });

  it('should return null when the component has no concepts', () => {
    const input = {
      system: 'http://example.org/zoo',
      concept: [] as any[]
    };
    const result = ValueSetConceptComponentRuleExtractor.process(input, true);

    expect(result).toBeNull();
  });
});
