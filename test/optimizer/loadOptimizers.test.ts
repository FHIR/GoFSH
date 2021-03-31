import path from 'path';
import '../helpers/loggerSpy'; // side-effect: suppresses logs
import { loadOptimizers, OptimizerPlugin } from '../../src/optimizer';
import { loggerSpy } from '../helpers/loggerSpy';

describe('optimizer', () => {
  describe('#loadOptimizers', () => {
    let optimizers: OptimizerPlugin[];

    describe('#standard', () => {
      beforeAll(async () => {
        optimizers = await loadOptimizers();
      });

      it('should load the standard optimizers', () => {
        // NOTE: Intentionally unspecific so that adding new optimizers does not break it
        expect(optimizers.length).toBeGreaterThan(10);
        optimizers.forEach(o => expect(o.optimize).toBeDefined());
        expect(optimizers.find(o => o.name === 'combine_card_and_flag_rules')).toBeTruthy();
      });

      it('should load the standard optimizers in the expected order', () => {
        optimizers.forEach((opt, i) => {
          opt.runAfter?.forEach(dependsOn => {
            const dependsOnIndices = optimizers
              .map((otherOpt, index) => {
                if (otherOpt.name === opt.name) {
                  return '';
                }
                if (dependsOn instanceof RegExp && dependsOn.test(otherOpt.name)) {
                  return index;
                } else if (typeof dependsOn === 'string' && dependsOn === otherOpt.name) {
                  return index;
                } else {
                  return '';
                }
              })
              .filter(String);
            expect(dependsOnIndices.length).not.toBe(0);
            dependsOnIndices.forEach(dependencyIndex => {
              try {
                expect(dependencyIndex).toBeLessThan(i);
              } catch {
                throw new Error(
                  `Expected ${opt.name} (i: ${i}) to come after ${dependsOn} (i: ${dependencyIndex})`
                );
              }
            });
          });
          opt.runBefore?.forEach(dependedOnBy => {
            const dependedOnByIndices = optimizers
              .map((otherOpt, index) => {
                if (otherOpt.name === opt.name) {
                  return '';
                }
                if (dependedOnBy instanceof RegExp && dependedOnBy.test(otherOpt.name)) {
                  return index;
                } else if (typeof dependedOnBy === 'string' && dependedOnBy === otherOpt.name) {
                  return index;
                } else {
                  return '';
                }
              })
              .filter(String);
            expect(dependedOnByIndices.length).not.toBe(0);
            dependedOnByIndices.forEach(dependedOnByIdx => {
              try {
                expect(dependedOnByIdx).toBeGreaterThan(i);
              } catch {
                throw new Error(
                  `Expected ${opt.name} (i: ${i}) to come before ${dependedOnBy} (i: ${dependedOnByIdx})`
                );
              }
            });
          });
        });
      });
    });

    describe('#custom', () => {
      afterEach(() => loggerSpy.reset());

      it('should load custom optimizers in the expected order', async () => {
        const custom = await loadOptimizers(path.join(__dirname, 'fixtures', 'custom-optimizers'));
        const names = custom.map(o => o.name);
        expect(names).toEqual(['d', 'b', 'c', 'a', 'e']);
      });

      it('should load custom optimizers but skip non-optimizers', async () => {
        const custom = await loadOptimizers(
          path.join(__dirname, 'fixtures', 'with-non-optimizers')
        );
        const names = custom.map(o => o.name);
        expect(names).toHaveLength(3);
        expect(names).toContain('a');
        expect(names).toContain('b');
        expect(names).toContain('c');
      });

      it('should log an error on circular dependencies', async () => {
        const custom = await loadOptimizers(
          path.join(__dirname, 'fixtures', 'circular-optimizers')
        );
        expect(loggerSpy.getLastMessage('error')).toMatch('cyclic dependency involving b');
        const names = custom.map(o => o.name);
        expect(names).toEqual(['a', 'b', 'c', 'd', 'e']);
      });

      it('should log an error on missing dependencies', async () => {
        const custom = await loadOptimizers(
          path.join(__dirname, 'fixtures', 'missing-dependency-optimizers')
        );

        const errors = loggerSpy.getAllMessages('error');
        expect(errors).toHaveLength(3);
        expect(errors.some(e => / b .* runBefore: x$/.test(e))).toBeTruthy();
        expect(errors.some(e => / c .* runAfter: y$/.test(e))).toBeTruthy();
        expect(errors.some(e => / c .* runAfter: z$/.test(e))).toBeTruthy();

        const names = custom.map(o => o.name);
        // It should still sort them correctly otherwise
        expect(names).toEqual(['d', 'b', 'c', 'a', 'e']);
      });
    });
  });
});
