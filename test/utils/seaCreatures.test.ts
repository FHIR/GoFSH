import {
  SEA_CREATURES,
  GOOD_ACTIONS,
  BAD_ACTIONS,
  getRandomSeaCreatures,
  getRandomSeaCreaturesStat
} from '../../src/utils';

describe('seaCreatures', () => {
  describe('#getSeaCreatures', () => {
    it('should get a random sea creature', () => {
      expect(SEA_CREATURES).toContain(getRandomSeaCreatures());
    });
  });

  describe('#getSeaCreatureStat', () => {
    it('should get a nice action when there are no errors or warnings', () => {
      const stat = getRandomSeaCreaturesStat(0, 0);
      const matches = stat.match(/^\d+ (\w+)/);
      expect(matches).toHaveLength(2);
      expect(GOOD_ACTIONS).toContain(matches[1]);
    });

    it('should get a bad action when there are warnings', () => {
      const stat = getRandomSeaCreaturesStat(0, 1);
      const matches = stat.match(/^\d+ (\w+)/);
      expect(matches).toHaveLength(2);
      expect(BAD_ACTIONS).toContain(matches[1]);
    });

    it('should get a bad action when there are errors', () => {
      const stat = getRandomSeaCreaturesStat(1, 0);
      const matches = stat.match(/^\d+ (\w+)/);
      expect(matches).toHaveLength(2);
      expect(BAD_ACTIONS).toContain(matches[1]);
    });
  });
});
