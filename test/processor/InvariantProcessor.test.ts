import path from 'path';
import fs from 'fs-extra';
import { fshtypes } from 'fsh-sushi';
import { InvariantProcessor } from '../../src/processor';
import { ExportableInvariant } from '../../src/exportable';

describe('InvariantProcessor', () => {
  it('should extract an invariant from a StructureDefinition with a constrained element', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'rules-profile.json'), 'utf-8')
    );
    const result = InvariantProcessor.process(input);
    const invariant = new ExportableInvariant('myo-1');
    invariant.severity = new fshtypes.FshCode('warning');
    invariant.description = 'SHALL include the weather.';

    expect(result).toHaveLength(1);
    expect(result).toContainEqual(invariant);
  });

  it('should extract invariants from a StructureDefinition with multiple constraints on the same element', () => {
    const input = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, 'fixtures', 'multiple-constraints-profile.json'),
        'utf-8'
      )
    );
    const result = InvariantProcessor.process(input);
    const weatherInvariant = new ExportableInvariant('myo-1');
    weatherInvariant.severity = new fshtypes.FshCode('warning');
    weatherInvariant.description = 'SHALL include the weather.';
    const whetherInvariant = new ExportableInvariant('myo-2');
    whetherInvariant.severity = new fshtypes.FshCode('error');
    whetherInvariant.description = 'SHALL include whether there is weather.';

    expect(result).toHaveLength(2);
    expect(result).toContainEqual(weatherInvariant);
    expect(result).toContainEqual(whetherInvariant);
  });

  it('should extract invariants from a StructureDefinition with multiple constrained elements', () => {
    const input = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, 'fixtures', 'multiple-constrained-elements-profile.json'),
        'utf-8'
      )
    );
    const result = InvariantProcessor.process(input);
    const weatherInvariant = new ExportableInvariant('myo-1');
    weatherInvariant.severity = new fshtypes.FshCode('warning');
    weatherInvariant.description = 'SHALL include the weather.';
    weatherInvariant.expression = 'note.weather.exists()';
    const safeInvariant = new ExportableInvariant('myo-2');
    safeInvariant.severity = new fshtypes.FshCode('error');
    safeInvariant.description = 'SHALL use a safe method.';
    safeInvariant.xpath = 'f:method/safe';
    const inventorInvariant = new ExportableInvariant('myo-3');
    inventorInvariant.severity = new fshtypes.FshCode('error');
    inventorInvariant.description = 'SHALL include the method inventor.';
    inventorInvariant.expression = 'method.inventor.exists()';
    inventorInvariant.xpath = 'f:method/inventor';

    expect(result).toHaveLength(3);
    expect(result).toContainEqual(weatherInvariant);
    expect(result).toContainEqual(safeInvariant);
    expect(result).toContainEqual(inventorInvariant);
  });

  it('should extract no invariants from a StructureDefinition without constrained elements', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'fixtures', 'existing-slice-profile.json'), 'utf-8')
    );
    const result = InvariantProcessor.process(input);
    expect(result).toHaveLength(0);
  });
});
