import { CLEAN_RUN_PUNS, WARNING_PUNS, ERROR_PUNS, getRandomPun } from '../../src/utils';

describe('puns', () => {
  describe('#getRandomPun', () => {
    it('should get a clean run pun when there are no errors or warnings', () => {
      const pun = getRandomPun(0, 0);
      expect(CLEAN_RUN_PUNS).toContain(pun);
    });

    it('should get a warning pun when there are no errors but there are warnings', () => {
      const pun = getRandomPun(0, 1);
      expect(WARNING_PUNS).toContain(pun);
    });

    it('should get an error pun when there are errors', () => {
      const pun = getRandomPun(1, 1);
      expect(ERROR_PUNS).toContain(pun);
    });
  });
});
