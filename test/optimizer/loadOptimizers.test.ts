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
        optimizers.forEach(o => expect(o.optimize).toBeDefined);
        expect(optimizers.find(o => o.name === 'combine_card_and_flag_rules')).toBeTruthy();
      });

      it('should load the standard optimizers in the expected order', () => {
        optimizers.forEach((opt, i) => {
          opt.runAfter?.forEach(dependsOn => {
            const dependsOnIdx = optimizers.findIndex(otherOpt => otherOpt.name === dependsOn);
            expect(dependsOnIdx).not.toBe(-1);
            try {
              expect(dependsOnIdx).toBeLessThan(i);
            } catch {
              throw new Error(
                `Expected ${opt.name} (i: ${i}) to come after ${dependsOn} (i: ${dependsOnIdx})`
              );
            }
          });
          opt.runBefore?.forEach(dependedOnBy => {
            const dependedOnByIdx = optimizers.findIndex(
              otherOpt => otherOpt.name === dependedOnBy
            );
            expect(dependedOnByIdx).not.toBe(-1);
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

    describe('#custom', () => {
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
    });
  });
});
